import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { createMeetingSchema } from "@/lib/validation/schemas";
import { createMeetingDoc, listMeetingDocs, meetingToDto } from "@/lib/meetings/repository";
import { uploadFile, deleteFile } from "@/lib/storage/gridfs";
import { validateAudioUpload } from "@/lib/upload";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const docs = await listMeetingDocs(userId, {
      search: url.searchParams.get("q") ?? undefined,
      status:
        status === "uploaded" ||
        status === "processing" ||
        status === "completed" ||
        status === "failed"
          ? status
          : "all",
      limit: 50,
    });
    return NextResponse.json({ meetings: docs.map(meetingToDto) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  let uploadedFileId: Awaited<ReturnType<typeof uploadFile>> | null = null;
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      throw new AppError("Attach a recording to create a meeting.", {
        status: 400,
        code: "AUDIO_REQUIRED",
      });
    }
    if (form.get("consent") !== "true") {
      throw new AppError(
        "Confirm that you have consent from participants before uploading a recording.",
        { status: 400, code: "CONSENT_REQUIRED" },
      );
    }

    let participants: string[] = [];
    const participantsRaw = form.get("participantNames");
    if (typeof participantsRaw === "string" && participantsRaw.trim()) {
      try {
        const parsed = JSON.parse(participantsRaw);
        if (Array.isArray(parsed)) {
          participants = parsed.filter((value): value is string => typeof value === "string");
        }
      } catch {
        participants = participantsRaw.split(",").map((value) => value.trim());
      }
    }

    const durationRaw = form.get("durationSeconds");
    const duration =
      typeof durationRaw === "string" && durationRaw.length > 0
        ? Number(durationRaw)
        : null;

    const input = createMeetingSchema.parse({
      title: form.get("title"),
      participantNames: participants.filter(Boolean).slice(0, 30),
      language: form.get("language") ?? "en",
      durationSeconds:
        duration !== null && Number.isFinite(duration) ? duration : null,
    });

    if (!input.title) {
      throw new AppError("Add a meeting title.", {
        status: 400,
        code: "TITLE_REQUIRED",
      });
    }

    const audio = validateAudioUpload(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    uploadedFileId = await uploadFile(buffer, audio.filename, audio.mimeType, {
      userId,
      kind: "recording",
    });

    const meeting = await createMeetingDoc({
      userId,
      title: input.title,
      participantNames: input.participantNames,
      language: input.language,
      durationSeconds: input.durationSeconds ?? null,
      audio: {
        fileId: uploadedFileId,
        filename: audio.filename,
        mimeType: audio.mimeType,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json({ meeting: meetingToDto(meeting) }, { status: 201 });
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteFile(uploadedFileId);
      } catch {
        // Best-effort cleanup of an orphaned upload.
      }
    }
    return apiError(error);
  }
}
