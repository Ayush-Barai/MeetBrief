import { assembleDetail, getMeetingByShareHash } from "@/lib/meetings/repository";
import { buildReportMarkdown } from "@/lib/ai/report";
import { hashShareToken, isValidShareTokenFormat } from "@/lib/share";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!isValidShareTokenFormat(token)) {
      return new Response("Not found", { status: 404 });
    }
    const doc = await getMeetingByShareHash(hashShareToken(token));
    if (!doc || !doc.share) {
      return new Response("Not found", { status: 404 });
    }
    const meeting = await assembleDetail(doc);
    if (!meeting.report) {
      return new Response("Report is not ready", { status: 409 });
    }
    const markdown = buildReportMarkdown({
      title: meeting.title,
      createdAt: meeting.createdAt,
      participants: meeting.participantNames,
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
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
