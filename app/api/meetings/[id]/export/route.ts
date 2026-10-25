import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { loadMeetingDetail } from "@/lib/meetings/repository";
import { buildReportMarkdown } from "@/lib/ai/report";
import { speakerLabelsFor } from "@/lib/speakers";

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
      return new Response("Meeting not found", { status: 404 });
    }
    if (!meeting.report) {
      return new Response("Report is not ready", { status: 409 });
    }
    const markdown = buildReportMarkdown({
      title: meeting.title,
      createdAt: meeting.createdAt,
      speakers: speakerLabelsFor(
        meeting.transcript,
        meeting.report.speakerSuggestions ?? [],
      ),
      language: meeting.language,
      report: meeting.report,
      actionItems: meeting.actionItems,
      recapScript: meeting.recap.script,
    });
    const safeName =
      meeting.title.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) ||
      "meeting-report";
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.md"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
