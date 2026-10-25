import "server-only";

import {
  ObjectId,
  type WithId,
  type Document,
} from "mongodb";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";
import type {
  ActionItem,
  ActionPriority,
  ActionStatus,
  AudioRef,
  DecisionStatus,
  EvidenceRef,
  Meeting,
  MeetingDetail,
  MeetingReport,
  MeetingStats,
  MeetingStatus,
  ProcessingStage,
  RecapMeta,
  TranscriptSegment,
  TranscriptMeta,
} from "@/types";

export interface MeetingDoc extends Document {
  _id: ObjectId;
  userId: string;
  title: string;
  language: string;
  status: MeetingStatus;
  processingStage: ProcessingStage;
  cancelRequested: boolean;
  durationSeconds: number | null;
  audio: {
    fileId: ObjectId;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  } | null;
  transcriptMeta: TranscriptMeta | null;
  recap: {
    status: RecapMeta["status"];
    script: string | null;
    fileId: ObjectId | null;
    generatedAt: Date | null;
    voiceId: string | null;
    mimeType: string | null;
    error: string | null;
  };
  share: { tokenHash: string; createdAt: Date } | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportDoc extends Document {
  _id: ObjectId;
  meetingId: ObjectId;
  executiveSummary: MeetingReport["executiveSummary"];
  discussionPoints: MeetingReport["discussionPoints"];
  speakerSuggestions: MeetingReport["speakerSuggestions"];
  speakerContributions: MeetingReport["speakerContributions"];
  decisions: MeetingReport["decisions"];
  openQuestions: MeetingReport["openQuestions"];
  nextMeeting: MeetingReport["nextMeeting"];
  version: number;
  generatedAt: Date;
  editedAt: Date | null;
  validationWarnings: string[];
  model: string | null;
}

export interface ActionDoc extends Document {
  _id: ObjectId;
  meetingId: ObjectId;
  task: string;
  owner: string;
  deadline: string;
  priority: ActionPriority;
  status: ActionStatus;
  evidenceTimestamp: number | null;
  evidenceText: string | null;
  sourceSegmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentDoc extends Document {
  _id: ObjectId;
  meetingId: ObjectId;
  position: number;
  startSeconds: number;
  endSeconds: number;
  speakerId: string;
  speakerLabel: string;
  text: string;
  confidence: number | null;
}

export function toObjectId(value: string | null | undefined): ObjectId | null {
  if (!value || !/^[a-f0-9]{24}$/i.test(value)) return null;
  return new ObjectId(value);
}

export function meetingToDto(doc: MeetingDoc): Meeting {
  const recap: RecapMeta = {
    status: doc.recap?.status ?? "none",
    script: doc.recap?.script ?? null,
    generatedAt: doc.recap?.generatedAt?.toISOString() ?? null,
    voiceId: doc.recap?.voiceId ?? null,
    mimeType: doc.recap?.mimeType ?? null,
    error: doc.recap?.error ?? null,
  };
  const audio: AudioRef | null = doc.audio
    ? {
        filename: doc.audio.filename,
        mimeType: doc.audio.mimeType,
        sizeBytes: doc.audio.sizeBytes,
      }
    : null;

  return {
    id: doc._id.toHexString(),
    title: doc.title,
    language: doc.language,
    status: doc.status,
    processingStage: doc.processingStage ?? "queued",
    durationSeconds: doc.durationSeconds ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    errorMessage: doc.errorMessage ?? null,
    audio,
    transcriptMeta: doc.transcriptMeta ?? null,
    recap,
    shareEnabled: Boolean(doc.share?.tokenHash),
  };
}

export function reportToDto(doc: ReportDoc): MeetingReport {
  return {
    executiveSummary: doc.executiveSummary,
    discussionPoints: doc.discussionPoints ?? [],
    speakerSuggestions: doc.speakerSuggestions ?? [],
    speakerContributions: doc.speakerContributions ?? [],
    decisions: doc.decisions ?? [],
    openQuestions: doc.openQuestions ?? [],
    nextMeeting: doc.nextMeeting ?? { proposedDate: null, agenda: [] },
    version: doc.version,
    generatedAt: doc.generatedAt.toISOString(),
    editedAt: doc.editedAt?.toISOString() ?? null,
    validationWarnings: doc.validationWarnings ?? [],
    model: doc.model ?? null,
  };
}

export function actionToDto(doc: ActionDoc): ActionItem {
  return {
    id: doc._id.toHexString(),
    meetingId: doc.meetingId.toHexString(),
    task: doc.task,
    owner: doc.owner,
    deadline: doc.deadline,
    priority: doc.priority,
    status: doc.status,
    evidenceTimestamp: doc.evidenceTimestamp ?? null,
    evidenceText: doc.evidenceText ?? null,
    sourceSegmentId: doc.sourceSegmentId ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function segmentToDto(doc: SegmentDoc): TranscriptSegment {
  return {
    id: doc._id.toHexString(),
    meetingId: doc.meetingId.toHexString(),
    position: doc.position,
    startSeconds: doc.startSeconds,
    endSeconds: doc.endSeconds,
    speakerId: doc.speakerId,
    speakerLabel: doc.speakerLabel,
    text: doc.text,
    confidence: doc.confidence ?? null,
  };
}

export async function getMeetingDoc(
  userId: string,
  meetingId: string,
): Promise<MeetingDoc | null> {
  const oid = toObjectId(meetingId);
  if (!oid) return null;
  const db = await getDb();
  return db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOne({ _id: oid, userId });
}

export async function getMeetingByShareHash(
  tokenHash: string,
): Promise<MeetingDoc | null> {
  const db = await getDb();
  return db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOne({ "share.tokenHash": tokenHash, status: "completed" });
}

export async function loadMeetingDetail(
  userId: string,
  meetingId: string,
): Promise<MeetingDetail | null> {
  const meeting = await getMeetingDoc(userId, meetingId);
  if (!meeting) return null;
  return assembleDetail(meeting);
}

export async function assembleDetail(meeting: MeetingDoc): Promise<MeetingDetail> {
  const db = await getDb();
  const [report, actions, segments] = await Promise.all([
    db
      .collection<ReportDoc>(COLLECTIONS.reports)
      .findOne({ meetingId: meeting._id }),
    db
      .collection<ActionDoc>(COLLECTIONS.actions)
      .find({ meetingId: meeting._id })
      .sort({ createdAt: 1 })
      .toArray(),
    db
      .collection<SegmentDoc>(COLLECTIONS.transcripts)
      .find({ meetingId: meeting._id })
      .sort({ position: 1 })
      .toArray(),
  ]);

  return {
    ...meetingToDto(meeting),
    report: report ? reportToDto(report) : null,
    actionItems: actions.map(actionToDto),
    transcript: segments.map(segmentToDto),
  };
}

export interface MeetingFilters {
  search?: string;
  status?: MeetingStatus | "all";
  from?: string;
  to?: string;
  limit?: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listMeetingDocs(
  userId: string,
  filters: MeetingFilters = {},
): Promise<MeetingDoc[]> {
  const db = await getDb();
  const query: Document = { userId };
  if (filters.search) {
    query.title = { $regex: escapeRegex(filters.search), $options: "i" };
  }
  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }
  if (filters.from || filters.to) {
    const createdAt: Document = {};
    if (filters.from) {
      const date = new Date(`${filters.from}T00:00:00.000Z`);
      if (!Number.isNaN(date.getTime())) createdAt.$gte = date;
    }
    if (filters.to) {
      const date = new Date(`${filters.to}T23:59:59.999Z`);
      if (!Number.isNaN(date.getTime())) createdAt.$lte = date;
    }
    if (Object.keys(createdAt).length) query.createdAt = createdAt;
  }
  return db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(filters.limit ?? 50, 100))
    .toArray();
}

export async function getMeetingStats(userId: string): Promise<MeetingStats> {
  const db = await getDb();
  const [total, completed, processing, pendingActions, minutes] = await Promise.all([
    db.collection(COLLECTIONS.meetings).countDocuments({ userId }),
    db
      .collection(COLLECTIONS.meetings)
      .countDocuments({ userId, status: "completed" }),
    db
      .collection(COLLECTIONS.meetings)
      .countDocuments({ userId, status: "processing" }),
    db
      .collection(COLLECTIONS.actions)
      .aggregate<{ count: number }>([
        {
          $lookup: {
            from: COLLECTIONS.meetings,
            localField: "meetingId",
            foreignField: "_id",
            as: "meeting",
          },
        },
        { $unwind: "$meeting" },
        { $match: { "meeting.userId": userId, status: { $ne: "completed" } } },
        { $count: "count" },
      ])
      .next()
      .then((result) => result?.count ?? 0),
    db
      .collection(COLLECTIONS.meetings)
      .aggregate<{ total: number }>([
        { $match: { userId, durationSeconds: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$durationSeconds" } } },
      ])
      .next()
      .then((result) => result?.total ?? 0),
  ]);

  return {
    total,
    completed,
    processing,
    pendingActions,
    totalMinutes: Math.round((minutes ?? 0) / 60),
  };
}

export async function createMeetingDoc(input: {
  userId: string;
  title: string;
  language: string;
  durationSeconds: number | null;
  audio: MeetingDoc["audio"];
}): Promise<MeetingDoc> {
  const db = await getDb();
  const now = new Date();
  const doc: Omit<MeetingDoc, "_id"> = {
    userId: input.userId,
    title: input.title,
    language: input.language,
    status: "uploaded",
    processingStage: "queued",
    cancelRequested: false,
    durationSeconds: input.durationSeconds,
    audio: input.audio,
    transcriptMeta: null,
    recap: {
      status: "none",
      script: null,
      fileId: null,
      generatedAt: null,
      voiceId: null,
      mimeType: null,
      error: null,
    },
    share: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .insertOne(doc as MeetingDoc);
  return { ...doc, _id: result.insertedId } as MeetingDoc;
}

export async function updateMeetingDoc(
  userId: string,
  meetingId: string,
  update: Document,
): Promise<MeetingDoc | null> {
  const oid = toObjectId(meetingId);
  if (!oid) return null;
  const db = await getDb();
  return db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOneAndUpdate(
      { _id: oid, userId },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: "after" },
    )
    .then((result) => (result as WithId<MeetingDoc> | null) ?? null);
}

export async function deleteMeetingCascade(
  userId: string,
  meetingId: string,
): Promise<boolean> {
  const oid = toObjectId(meetingId);
  if (!oid) return false;
  const db = await getDb();
  const meeting = await db
    .collection<MeetingDoc>(COLLECTIONS.meetings)
    .findOne({ _id: oid, userId });
  if (!meeting) return false;

  const { deleteFile } = await import("@/lib/storage/gridfs");
  await Promise.all([
    deleteFile(meeting.audio?.fileId ?? null),
    deleteFile(meeting.recap?.fileId ?? null),
  ]);
  await Promise.all([
    db.collection(COLLECTIONS.transcripts).deleteMany({ meetingId: oid }),
    db.collection(COLLECTIONS.reports).deleteMany({ meetingId: oid }),
    db.collection(COLLECTIONS.actions).deleteMany({ meetingId: oid }),
  ]);
  await db.collection(COLLECTIONS.meetings).deleteOne({ _id: oid, userId });
  return true;
}

export async function saveTranscript(
  meetingId: ObjectId,
  segments: Array<Omit<TranscriptSegment, "id" | "meetingId">>,
  meta: TranscriptMeta,
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.transcripts).deleteMany({ meetingId });
  if (segments.length) {
    await db.collection(COLLECTIONS.transcripts).insertMany(
      segments.map((segment) => ({
        meetingId,
        position: segment.position,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        speakerId: segment.speakerId,
        speakerLabel: segment.speakerLabel,
        text: segment.text,
        confidence: segment.confidence,
      })),
    );
  }
  await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
    { _id: meetingId },
    { $set: { transcriptMeta: meta, updatedAt: new Date() } },
  );
}

export async function saveReport(
  meetingId: ObjectId,
  report: Omit<MeetingReport, "generatedAt" | "editedAt"> & {
    generatedAt: Date;
    editedAt: Date | null;
  },
): Promise<void> {
  const db = await getDb();
  await db.collection<ReportDoc>(COLLECTIONS.reports).updateOne(
    { meetingId },
    {
      $set: {
        meetingId,
        executiveSummary: report.executiveSummary,
        discussionPoints: report.discussionPoints,
        speakerSuggestions: report.speakerSuggestions,
        speakerContributions: report.speakerContributions,
        decisions: report.decisions,
        openQuestions: report.openQuestions,
        nextMeeting: report.nextMeeting,
        version: report.version,
        generatedAt: report.generatedAt,
        editedAt: report.editedAt,
        validationWarnings: report.validationWarnings,
        model: report.model,
      },
    },
    { upsert: true },
  );
}

export async function replaceActionItems(
  meetingId: ObjectId,
  items: Array<{
    task: string;
    owner: string;
    deadline: string;
    priority: ActionPriority;
    status: ActionStatus;
    evidenceTimestamp: number | null;
    evidenceText: string | null;
    sourceSegmentId: string | null;
  }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection(COLLECTIONS.actions).deleteMany({ meetingId });
  if (items.length) {
    await db.collection(COLLECTIONS.actions).insertMany(
      items.map((item) => ({
        meetingId,
        ...item,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
}

export interface PendingActionRow extends ActionItem {
  meetingTitle: string;
}

export async function listPendingActions(
  userId: string,
  limit = 6,
): Promise<PendingActionRow[]> {
  const db = await getDb();
  const rows = await db
    .collection(COLLECTIONS.actions)
    .aggregate<
      ActionDoc & { meetingTitle: string; meetingCreatedAt: Date }
    >([
      {
        $lookup: {
          from: COLLECTIONS.meetings,
          localField: "meetingId",
          foreignField: "_id",
          as: "meeting",
        },
      },
      { $unwind: "$meeting" },
      { $match: { "meeting.userId": userId, status: { $ne: "completed" } } },
      { $sort: { updatedAt: -1 } },
      { $limit: Math.min(limit, 20) },
      {
        $project: {
          meetingId: 1,
          task: 1,
          owner: 1,
          deadline: 1,
          priority: 1,
          status: 1,
          evidenceTimestamp: 1,
          evidenceText: 1,
          sourceSegmentId: 1,
          createdAt: 1,
          updatedAt: 1,
          meetingTitle: "$meeting.title",
        },
      },
    ])
    .toArray();
  return rows.map((row) => ({
    ...actionToDto(row as ActionDoc),
    meetingTitle: row.meetingTitle,
  }));
}

export async function getActionDoc(
  userId: string,
  meetingId: string,
  actionId: string,
): Promise<ActionDoc | null> {
  const meetingOid = toObjectId(meetingId);
  const actionOid = toObjectId(actionId);
  if (!meetingOid || !actionOid) return null;
  const db = await getDb();
  const meeting = await db
    .collection(COLLECTIONS.meetings)
    .findOne({ _id: meetingOid, userId }, { projection: { _id: 1 } });
  if (!meeting) return null;
  return db
    .collection<ActionDoc>(COLLECTIONS.actions)
    .findOne({ _id: actionOid, meetingId: meetingOid });
}

export function evidenceDto(input: {
  segmentId: string;
  timestampSeconds: number | null;
  quote: string;
}): EvidenceRef {
  return {
    segmentId: input.segmentId,
    timestampSeconds: input.timestampSeconds ?? 0,
    quote: input.quote,
  };
}

export function parseDecisionStatus(value: string): DecisionStatus {
  return value === "confirmed" ? "confirmed" : "tentative";
}
