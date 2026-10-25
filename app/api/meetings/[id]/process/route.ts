import { NextResponse } from "next/server";
import { after } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { getIntegrationStatus } from "@/lib/config";
import {
  cancelMeetingProcessing,
  claimMeetingForProcessing,
  runMeetingProcessing,
} from "@/lib/meetings/processing";
import { meetingToDto } from "@/lib/meetings/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await context.params;

    const integrations = getIntegrationStatus();
    if (!integrations.transcription.configured) {
      return NextResponse.json(
        {
          error: `Transcription is not configured. ${integrations.transcription.detail}`,
          code: "TRANSCRIPTION_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }
    if (!integrations.gemma.configured) {
      return NextResponse.json(
        {
          error: `Gemma is not configured. ${integrations.gemma.detail}`,
          code: "GEMMA_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const meeting = await claimMeetingForProcessing(userId, id);

    after(async () => {
      await runMeetingProcessing(id);
    });

    return NextResponse.json({ meeting: meetingToDto(meeting) }, { status: 202 });
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
    await cancelMeetingProcessing(userId, id);
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    return apiError(error);
  }
}
