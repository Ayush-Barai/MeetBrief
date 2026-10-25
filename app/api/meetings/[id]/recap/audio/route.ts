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
    if (!meeting?.recap?.fileId || meeting.recap.status !== "ready") {
      return new Response("Recap audio not found", { status: 404 });
    }
    return audioResponse(
      meeting.recap.fileId,
      meeting.recap.mimeType ?? "audio/mpeg",
      request,
      `meetbrief-recap-${id}.mp3`,
    );
  } catch (error) {
    return apiError(error);
  }
}
