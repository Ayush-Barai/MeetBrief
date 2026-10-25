import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { apiError, unauthorized } from "@/lib/api";
import { actionItemUpdateSchema } from "@/lib/validation/schemas";
import {
  actionToDto,
  getActionDoc,
  getMeetingDoc,
  type ActionDoc,
} from "@/lib/meetings/repository";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; actionId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id, actionId } = await context.params;
    const action = await getActionDoc(userId, id, actionId);
    if (!action) {
      return NextResponse.json(
        { error: "Action item not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    const input = actionItemUpdateSchema.parse(await request.json());
    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { error: "No fields were provided." },
        { status: 400 },
      );
    }
    const db = await getDb();
    await db.collection<ActionDoc>(COLLECTIONS.actions).updateOne(
      { _id: action._id },
      { $set: { ...input, updatedAt: new Date() } },
    );
    const updated = await db
      .collection<ActionDoc>(COLLECTIONS.actions)
      .findOne({ _id: action._id });
    return NextResponse.json({ action: updated ? actionToDto(updated) : null });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; actionId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id, actionId } = await context.params;
    const meeting = await getMeetingDoc(userId, id);
    const action = await getActionDoc(userId, id, actionId);
    if (!meeting || !action) {
      return NextResponse.json(
        { error: "Action item not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    const db = await getDb();
    await db.collection(COLLECTIONS.actions).deleteOne({ _id: action._id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
