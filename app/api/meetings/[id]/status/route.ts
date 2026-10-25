import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { getMeetingDoc, meetingToDto } from "@/lib/meetings/repository";

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
    const meeting = await getMeetingDoc(userId, id);
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        status: meeting.status,
        processingStage: meeting.processingStage,
        errorMessage: meeting.errorMessage,
        recapStatus: meeting.recap?.status ?? "none",
        updatedAt: meeting.updatedAt.toISOString(),
        meeting: meetingToDto(meeting),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
