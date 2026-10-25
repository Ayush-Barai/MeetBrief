import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { getMeetingDoc, type MeetingDoc } from "@/lib/meetings/repository";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";
import { createShareToken } from "@/lib/share";
import { shareSchema } from "@/lib/validation/schemas";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await context.params;
    const input = shareSchema.parse(await request.json());
    const meeting = await getMeetingDoc(userId, id);
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!input.enabled) {
      const db = await getDb();
      await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
        { _id: meeting._id, userId },
        { $set: { share: null, updatedAt: new Date() } },
      );
      return NextResponse.json({ enabled: false, url: null });
    }

    if (meeting.status !== "completed") {
      return NextResponse.json(
        {
          error: "Only completed reports can be shared.",
          code: "REPORT_NOT_READY",
        },
        { status: 409 },
      );
    }

    const { token, tokenHash } = createShareToken();
    const db = await getDb();
    await db.collection<MeetingDoc>(COLLECTIONS.meetings).updateOne(
      { _id: meeting._id, userId },
      {
        $set: {
          share: { tokenHash, createdAt: new Date() },
          updatedAt: new Date(),
        },
      },
    );
    return NextResponse.json({
      enabled: true,
      url: `${config.appUrl.replace(/\/+$/, "")}/share/${token}`,
    });
  } catch (error) {
    return apiError(error);
  }
}
