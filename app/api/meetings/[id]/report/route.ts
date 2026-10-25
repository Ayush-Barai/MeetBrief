import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { reportEditSchema } from "@/lib/validation/schemas";
import {
  getMeetingDoc,
  reportToDto,
  type ReportDoc,
} from "@/lib/meetings/repository";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";
import type { EvidenceRef } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function preservedEvidence<
  T extends {
    evidence?: Array<{
      segmentId: string;
      timestampSeconds: number | null;
      quote: string;
    }>;
  },
>(
  incoming: T[],
  existing: Array<{ evidence?: EvidenceRef[] }>,
): Array<T & { evidence: EvidenceRef[] }> {
  return incoming.map((item, index) => ({
    ...item,
    evidence: (item.evidence ?? existing[index]?.evidence ?? []).map((reference) => ({
      segmentId: reference.segmentId,
      timestampSeconds: reference.timestampSeconds ?? 0,
      quote: reference.quote,
    })),
  }));
}

export async function PATCH(
  request: Request,
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
    const db = await getDb();
    const existing = await db
      .collection<ReportDoc>(COLLECTIONS.reports)
      .findOne({ meetingId: meeting._id });
    if (!existing) {
      return NextResponse.json(
        { error: "This meeting does not have a report yet.", code: "REPORT_REQUIRED" },
        { status: 409 },
      );
    }

    const input = reportEditSchema.parse(await request.json());
    const update: Record<string, unknown> = {
      editedAt: new Date(),
      version: existing.version + 1,
    };
    if (input.executiveSummary) update.executiveSummary = input.executiveSummary;
    if (input.discussionPoints) {
      update.discussionPoints = preservedEvidence(
        input.discussionPoints,
        existing.discussionPoints,
      );
    }
    if (input.speakerContributions) {
      update.speakerContributions = preservedEvidence(
        input.speakerContributions,
        existing.speakerContributions,
      );
    }
    if (input.decisions) {
      update.decisions = preservedEvidence(input.decisions, existing.decisions);
    }
    if (input.openQuestions) {
      update.openQuestions = preservedEvidence(
        input.openQuestions,
        existing.openQuestions,
      );
    }
    if (input.nextMeeting) update.nextMeeting = input.nextMeeting;

    await db.collection<ReportDoc>(COLLECTIONS.reports).updateOne(
      { meetingId: meeting._id },
      { $set: update },
    );
    await db.collection(COLLECTIONS.meetings).updateOne(
      { _id: meeting._id },
      { $set: { "recap.status": "stale", updatedAt: new Date() } },
    );

    const updated = await db
      .collection<ReportDoc>(COLLECTIONS.reports)
      .findOne({ meetingId: meeting._id });
    return NextResponse.json({
      report: updated ? reportToDto(updated) : null,
      recapNeedsRefresh: true,
    });
  } catch (error) {
    return apiError(error);
  }
}
