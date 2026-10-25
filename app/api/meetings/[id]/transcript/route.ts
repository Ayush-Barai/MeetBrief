import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { transcriptUpdateSchema } from "@/lib/validation/schemas";
import {
  getMeetingDoc,
  reportToDto,
  toObjectId,
  type ActionDoc,
  type ReportDoc,
  type SegmentDoc,
} from "@/lib/meetings/repository";
import {
  renameSpeakerInActionItem,
  renameSpeakerInReport,
  replaceSpeakerName,
  type SpeakerRename,
} from "@/lib/speakers";
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
      const entries = Object.entries(input.speakerMap)
        .map(([speakerId, label]) => [speakerId, label.trim()] as const)
        .filter(([, label]) => label.length > 0)
        .slice(0, 60);

      const [segmentDocs, reportDoc, actionDocs] = await Promise.all([
        db
          .collection<SegmentDoc>(COLLECTIONS.transcripts)
          .find({ meetingId })
          .toArray(),
        db.collection<ReportDoc>(COLLECTIONS.reports).findOne({ meetingId }),
        db.collection<ActionDoc>(COLLECTIONS.actions).find({ meetingId }).toArray(),
      ]);

      const currentLabels = new Map<string, string>();
      for (const segment of segmentDocs) {
        if (!currentLabels.has(segment.speakerId)) {
          currentLabels.set(segment.speakerId, segment.speakerLabel);
        }
      }

      const report = reportDoc ? reportToDto(reportDoc) : null;
      let renamedReport = report;
      const renames: SpeakerRename[] = [];

      for (const [speakerId, name] of entries) {
        const aliases = new Set<string>();
        const currentLabel = currentLabels.get(speakerId);
        if (currentLabel && currentLabel !== name) aliases.add(currentLabel);

        const contribution = report?.speakerContributions.find(
          (item) => item.speakerId === speakerId,
        );
        if (contribution?.speakerName && contribution.speakerName !== name) {
          aliases.add(contribution.speakerName);
        }

        const suggestion = report?.speakerSuggestions.find(
          (item) => item.speakerId === speakerId,
        );
        if (suggestion?.suggestedName && suggestion.suggestedName !== name) {
          aliases.add(suggestion.suggestedName);
        }

        if (!aliases.size) continue;
        const rename: SpeakerRename = {
          speakerId,
          aliases: Array.from(aliases),
          name,
        };
        renames.push(rename);
        if (renamedReport) {
          renamedReport = renameSpeakerInReport(renamedReport, rename);
        }

        await db.collection<SegmentDoc>(COLLECTIONS.transcripts).updateMany(
          { meetingId, speakerId },
          { $set: { speakerLabel: name } },
        );
      }

      if (renamedReport && reportDoc) {
        await db.collection<ReportDoc>(COLLECTIONS.reports).updateOne(
          { meetingId },
          {
            $set: {
              executiveSummary: renamedReport.executiveSummary,
              discussionPoints: renamedReport.discussionPoints,
              speakerSuggestions: renamedReport.speakerSuggestions,
              speakerContributions: renamedReport.speakerContributions,
              decisions: renamedReport.decisions,
              openQuestions: renamedReport.openQuestions,
              nextMeeting: renamedReport.nextMeeting,
              validationWarnings: renamedReport.validationWarnings,
              editedAt: now,
              version: reportDoc.version + 1,
            },
          },
        );
      }

      if (renames.length && actionDocs.length) {
        const bulk = actionDocs
          .map((action) => {
            const renamed = renames.reduce(
              (item, rename) =>
                renameSpeakerInActionItem(item, rename.aliases, rename.name),
              { task: action.task, owner: action.owner },
            );
            if (
              renamed.task === action.task &&
              renamed.owner === action.owner
            ) {
              return null;
            }
            return {
              updateOne: {
                filter: { _id: action._id, meetingId },
                update: { $set: { ...renamed, updatedAt: now } },
              },
            };
          })
          .filter(
            (operation): operation is NonNullable<typeof operation> =>
              Boolean(operation),
          );
        if (bulk.length) {
          await db.collection(COLLECTIONS.actions).bulkWrite(bulk);
        }
      }

      // Keep the written recap script consistent and mark old audio as stale.
      let recapScript = meeting.recap?.script ?? null;
      if (recapScript) {
        for (const rename of renames) {
          for (const alias of rename.aliases) {
            recapScript = replaceSpeakerName(recapScript, alias, rename.name);
          }
        }
      }
      if (recapScript && recapScript !== meeting.recap?.script) {
        await db.collection(COLLECTIONS.meetings).updateOne(
          { _id: meetingId },
          {
            $set: {
              "recap.script": recapScript,
              ...(meeting.recap?.status === "ready" ||
              meeting.recap?.status === "generating"
                ? { "recap.status": "stale" }
                : {}),
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
