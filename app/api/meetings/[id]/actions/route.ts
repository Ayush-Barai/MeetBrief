import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { actionItemSchema } from "@/lib/validation/schemas";
import {
  actionToDto,
  getMeetingDoc,
  type ActionDoc,
} from "@/lib/meetings/repository";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";

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
    const meeting = await getMeetingDoc(userId, id);
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    const input = actionItemSchema.parse(await request.json());
    const now = new Date();
    const db = await getDb();
    const result = await db.collection<ActionDoc>(COLLECTIONS.actions).insertOne({
      meetingId: meeting._id,
      ...input,
      createdAt: now,
      updatedAt: now,
    } as ActionDoc);
    const created = await db
      .collection<ActionDoc>(COLLECTIONS.actions)
      .findOne({ _id: result.insertedId });
    return NextResponse.json(
      { action: created ? actionToDto(created) : null },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
