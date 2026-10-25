import "server-only";

import { ObjectId } from "mongodb";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";
import {
  actionToDto,
  meetingToDto,
  replaceActionItems,
  reportToDto,
  saveReport,
  saveTranscript,
  segmentToDto,
  type MeetingDoc,
  type ReportDoc,
  type SegmentDoc,
  type ActionDoc,
} from "@/lib/meetings/repository";
import { generateGemmaReport } from "@/lib/ai/gemma";
import { getTranscriptionAdapter } from "@/lib/transcription";
import { downloadFileBuffer, deleteFile, uploadFile } from "@/lib/storage/gridfs";
import { buildRecapScript, generateElevenLabsAudio } from "@/lib/elevenlabs";
import {
  AppError,
  IntegrationError,
  NotFoundError,
  safeErrorMessage,
} from "@/lib/errors";

class CancelledError extends Error {
  constructor() {
    super("Processing was cancelled.");
    this.name = "CancelledError";
  }
}

async function getMeetingById(meetingId: ObjectId): Promise<MeetingDoc | null> {
  const db = await getDb();
  return db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOne({ _id: meetingId });
}

async function setStage(
  meetingId: ObjectId,
  stage: MeetingDoc["processingStage"],
  extra: Record<string, unknown> = {},
): Promise<void> {
  const db = await getDb();
  await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
    { _id: meetingId, status: "processing", cancelRequested: { $ne: true } },
    { $set: { processingStage: stage, ...extra, updatedAt: new Date() } },
  );
}

async function ensureNotCancelled(meetingId: ObjectId): Promise<void> {
  const meeting = await getMeetingById(meetingId);
  if (
    !meeting ||
    meeting.cancelRequested ||
    meeting.status !== "processing"
  ) {
    throw new CancelledError();
  }
}

export async function claimMeetingForProcessing(
  userId: string,
  meetingId: string,
): Promise<MeetingDoc> {
  const oid = /^[a-f0-9]{24}$/i.test(meetingId) ? new ObjectId(meetingId) : null;
  if (!oid) throw new NotFoundError("Meeting not found.");
  const db = await getDb();
  const claimed = await db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOneAndUpdate(
      {
        _id: oid,
        userId,
        status: { $in: ["uploaded", "failed"] },
      },
      {
        $set: {
          status: "processing",
          processingStage: "queued",
          cancelRequested: false,
          errorMessage: null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

  if (!claimed) {
    const existing = await db
      .collection<MeetingDoc>(COLLECTIONS.meetings)
      .findOne({ _id: oid, userId });
    if (!existing) throw new NotFoundError("Meeting not found.");
    throw new AppError(
      "This meeting is already processing or completed. Delete it or upload a new recording to reprocess.",
      { status: 409, code: "ALREADY_PROCESSING" },
    );
  }
  return claimed;
}

export async function runMeetingProcessing(meetingId: string): Promise<void> {
  const oid = new ObjectId(meetingId);
  let stage: MeetingDoc["processingStage"] = "queued";
  try {
    const meeting = await getMeetingById(oid);
    if (!meeting) return;
    if (!meeting.audio?.fileId) {
      throw new AppError("The meeting has no stored audio file.", {
        status: 422,
        code: "NO_AUDIO",
      });
    }

    stage = "transcribing";
    await setStage(oid, stage);
    await ensureNotCancelled(oid);

    const buffer = await downloadFileBuffer(meeting.audio.fileId);
    const adapter = getTranscriptionAdapter();
    const result = await adapter.transcribe({
      buffer,
      filename: meeting.audio.filename,
      mimeType: meeting.audio.mimeType,
      language: meeting.language,
    });
    await ensureNotCancelled(oid);

    const meta = {
      provider: result.provider,
      model: result.model,
      language: result.language,
      generatedAt: new Date().toISOString(),
      diarized: result.diarized,
    };
    await saveTranscript(
      oid,
      result.segments.map((segment, index) => ({
        position: index,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        speakerId: segment.speakerId,
        speakerLabel: segment.speakerLabel,
        text: segment.text,
        confidence: segment.confidence,
      })),
      meta,
    );

    stage = "analyzing";
    await setStage(oid, stage);
    await ensureNotCancelled(oid);

    const db = await getDb();
    const segmentDocs = await db
      .collection<SegmentDoc>(COLLECTIONS.transcripts)
      .find({ meetingId: oid })
      .sort({ position: 1 })
      .toArray();
    const segments = segmentDocs.map(segmentToDto);
    const freshMeeting = await getMeetingById(oid);
    if (!freshMeeting) throw new NotFoundError("Meeting not found.");

    const generated = await generateGemmaReport(
      { ...meetingToDto(freshMeeting), isDemo: false },
      segments,
    );
    await ensureNotCancelled(oid);

    stage = "saving";
    await setStage(oid, stage);

    const now = new Date();
    await saveReport(oid, {
      ...generated.report,
      version: 1,
      generatedAt: now,
      editedAt: null,
      model: generated.model,
    });
    await replaceActionItems(oid, generated.actionItems);

    const lastSegment = segments[segments.length - 1];
    const actualDuration =
      meeting.durationSeconds && meeting.durationSeconds > 0
        ? meeting.durationSeconds
        : lastSegment?.endSeconds ?? null;

    const completed = await db
      .collection<MeetingDoc>(COLLECTIONS.meetings)
      .updateOne(
        {
          _id: oid,
          status: "processing",
          cancelRequested: { $ne: true },
        },
        {
          $set: {
            status: "completed",
            processingStage: "done",
            durationSeconds: actualDuration,
            errorMessage: null,
            updatedAt: new Date(),
          },
        },
      );

    if (completed.modifiedCount === 0) {
      throw new CancelledError();
    }
  } catch (error) {
    if (error instanceof CancelledError) {
      // The cancellation endpoint already set the failed state.
      return;
    }
    const message = safeErrorMessage(error);
    const db = await getDb();
    await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
      {
        _id: oid,
        status: "processing",
        cancelRequested: { $ne: true },
      },
      {
        $set: {
          status: "failed",
          processingStage: "failed",
          errorMessage: message,
          updatedAt: new Date(),
        },
      },
    );
    const code =
      error instanceof AppError ? error.code : (error as Error)?.name ?? "ERROR";
    console.error("[meetbrief:processing]", {
      meetingId,
      stage,
      code,
    });
  }
}

export async function cancelMeetingProcessing(
  userId: string,
  meetingId: string,
): Promise<void> {
  const db = await getDb();
  const oid = new ObjectId(meetingId);
  const result = await db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .updateOne(
      { _id: oid, userId, status: "processing" },
      {
        $set: {
          cancelRequested: true,
          status: "failed",
          processingStage: "failed",
          errorMessage:
            "Processing was cancelled. You can retry when you are ready.",
          updatedAt: new Date(),
        },
      },
    );
  if (result.matchedCount === 0) {
    throw new AppError("This meeting is not currently processing.", {
      status: 409,
      code: "NOT_PROCESSING",
    });
  }
}

export interface RecapResult {
  script: string;
  generatedAt: string;
}

export async function generateRecapForMeeting(
  userId: string,
  meetingId: string,
): Promise<RecapResult> {
  const db = await getDb();
  const oid = new ObjectId(meetingId);
  const meeting = await db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOne({ _id: oid, userId });
  if (!meeting) throw new NotFoundError("Meeting not found.");
  if (meeting.status !== "completed") {
    throw new AppError("Generate the report before creating an audio recap.", {
      status: 409,
      code: "REPORT_REQUIRED",
    });
  }

  const [reportDoc, actionDocs] = await Promise.all([
    db.collection<ReportDoc>(COLLECTIONS.reports).findOne({ meetingId: oid }),
    db
      .collection<ActionDoc>(COLLECTIONS.actions)
      .find({ meetingId: oid })
      .sort({ createdAt: 1 })
      .toArray(),
  ]);
  if (!reportDoc) {
    throw new AppError("No report exists for this meeting.", {
      status: 409,
      code: "REPORT_REQUIRED",
    });
  }

  const report = reportToDto(reportDoc);
  const actions = actionDocs.map(actionToDto);
  const script = buildRecapScript({
    title: meeting.title,
    report,
    actionItems: actions,
  });

  // Persist the script immediately so users can read it even if TTS fails.
  await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
    { _id: oid, userId },
    {
      $set: {
        "recap.status": "generating",
        "recap.script": script,
        "recap.error": null,
        updatedAt: new Date(),
      },
    },
  );

  try {
    const audio = await generateElevenLabsAudio(script);
    const fileId = await uploadFile(
      audio,
      `meetbrief-recap-${meetingId}.mp3`,
      "audio/mpeg",
      { meetingId, kind: "recap" },
    );
    const oldRecapFile = meeting.recap?.fileId ?? null;
    await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
      { _id: oid, userId },
      {
        $set: {
          "recap.status": "ready",
          "recap.script": script,
          "recap.fileId": fileId,
          "recap.generatedAt": new Date(),
          "recap.voiceId": process.env.ELEVENLABS_VOICE_ID ?? null,
          "recap.mimeType": "audio/mpeg",
          "recap.error": null,
          updatedAt: new Date(),
        },
      },
    );
    if (oldRecapFile && !oldRecapFile.equals(fileId)) {
      await deleteFile(oldRecapFile);
    }
    return { script, generatedAt: new Date().toISOString() };
  } catch (error) {
    const message = safeErrorMessage(error);
    await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
      { _id: oid, userId },
      {
        $set: {
          "recap.status": "failed",
          "recap.script": script,
          "recap.error": message,
          updatedAt: new Date(),
        },
      },
    );
    throw error instanceof AppError
      ? error
      : new IntegrationError(message, { code: "RECAP_FAILED" });
  }
}
