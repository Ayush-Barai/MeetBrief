import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { transcriptUpdateSchema } from "@/lib/validation/schemas";
import {
  getMeetingDoc,
  reportToDto,
  toObjectId,
  type ReportDoc,
  type SegmentDoc,
} from "@/lib/meetings/repository";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const meetingId = meeting._id;
    const input = transcriptUpdateSchema.parse(await request.json());
    const db = await getDb();
    const now = new Date();

    if (input.speakerMap && Object.keys(input.speakerMap).length) {
      const entries = Object.entries(input.speakerMap).slice(0, 60);
      for (const [speakerId, label] of entries) {
        await db.collection<SegmentDoc>(COLLECTIONS.transcripts).updateMany(
          { meetingId, speakerId },
          { $set: { speakerLabel: label } },
        );
      }
      // Keep report speaker names aligned with the transcript mapping.
      const report = await db
        .collection<ReportDoc>(COLLECTIONS.reports)
        .findOne({ meetingId });
      if (report) {
        const updated = report.speakerContributions.map((contribution) => ({
          ...contribution,
          speakerName:
            input.speakerMap?.[contribution.speakerId] ?? contribution.speakerName,
        }));
        await db.collection<ReportDoc>(COLLECTIONS.reports).updateOne(
          { meetingId },
          {
            $set: {
              speakerContributions: updated,
              editedAt: now,
              version: report.version + 1,
            },
          },
        );
      }
    }

    if (input.segments?.length) {
      const updates = input.segments.slice(0, 5_000);
      const bulk = updates
        .map((segment) => {
          const oid = toObjectId(segment.id);
          if (!oid) return null;
          return {
            updateOne: {
              filter: { _id: oid, meetingId },
              update: {
                $set: {
                  text: segment.text,
                  speakerLabel: segment.speakerLabel,
                },
              },
            },
          };
        })
        .filter((operation): operation is NonNullable<typeof operation> =>
          Boolean(operation),
        );
      if (bulk.length) {
        await db.collection(COLLECTIONS.transcripts).bulkWrite(bulk);
      }
    }

    await db.collection(COLLECTIONS.meetings).updateOne(
      { _id: meetingId },
      { $set: { updatedAt: now } },
    );

    return NextResponse.json({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}
