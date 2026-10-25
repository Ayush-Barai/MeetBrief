import { getMeetingByShareHash } from "@/lib/meetings/repository";
import { audioResponse } from "@/lib/http/audio";
import { hashShareToken, isValidShareTokenFormat } from "@/lib/share";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!isValidShareTokenFormat(token)) {
      return new Response("Not found", { status: 404 });
    }
    const meeting = await getMeetingByShareHash(hashShareToken(token));
    if (
      !meeting?.recap?.fileId ||
      meeting.recap.status !== "ready" ||
      !meeting.share
    ) {
      return new Response("Not found", { status: 404 });
    }
    return audioResponse(
      meeting.recap.fileId,
      meeting.recap.mimeType ?? "audio/mpeg",
      request,
      "meetbrief-recap.mp3",
    );
  } catch (error) {
    return apiError(error);
  }
}
