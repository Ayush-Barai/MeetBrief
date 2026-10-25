import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import {
  deleteMeetingCascade,
  getMeetingDoc,
  loadMeetingDetail,
  meetingToDto,
} from "@/lib/meetings/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await context.params;
    const meeting = await loadMeetingDetail(userId, id);
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ meeting });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await context.params;
    const existing = await getMeetingDoc(userId, id);
    if (!existing) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (existing.status === "processing") {
      return NextResponse.json(
        {
          error: "Cancel processing before deleting this meeting.",
          code: "PROCESSING_ACTIVE",
        },
        { status: 409 },
      );
    }
    const deleted = await deleteMeetingCascade(userId, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
    };
    const existing = await getMeetingDoc(userId, id);
    if (!existing) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    const update: Record<string, unknown> = {};
    if (typeof body.title === "string") {
      const title = body.title.trim().slice(0, 160);
      if (title.length < 2) {
        return NextResponse.json(
          { error: "The title must be at least 2 characters." },
          { status: 400 },
        );
      }
      update.title = title;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No supported fields were provided." },
        { status: 400 },
      );
    }
    const { updateMeetingDoc } = await import("@/lib/meetings/repository");
    const updated = await updateMeetingDoc(userId, id, update);
    return NextResponse.json({ meeting: updated ? meetingToDto(updated) : null });
  } catch (error) {
    return apiError(error);
  }
}
