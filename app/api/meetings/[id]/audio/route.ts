import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { getMeetingDoc } from "@/lib/meetings/repository";
import { audioResponse } from "@/lib/http/audio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await context.params;
    const meeting = await getMeetingDoc(userId, id);
    if (!meeting?.audio?.fileId) {
      return new Response("Audio not found", { status: 404 });
    }
    return audioResponse(
      meeting.audio.fileId,
      meeting.audio.mimeType,
      request,
      meeting.audio.filename,
    );
  } catch (error) {
    return apiError(error);
  }
}
