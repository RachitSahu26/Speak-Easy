import { and, eq, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { callSessions } from "@/lib/db/schema";

const createCallSessionSchema = z.object({
  roomId: z.string().trim().min(3),
  partnerUserId: z.string().uuid(),
});

const endCallSessionSchema = z.object({
  callSessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createCallSessionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { roomId, partnerUserId } = parsed.data;
    const userId = session.user.id;

    if (partnerUserId === userId) {
      return NextResponse.json({ message: "Cannot create self call session" }, { status: 400 });
    }

    const [existing] = await db
      .select({
        id: callSessions.id,
      })
      .from(callSessions)
      .where(eq(callSessions.roomId, roomId))
      .limit(1);

    if (existing) {
      return NextResponse.json({ callSessionId: existing.id }, { status: 200 });
    }

    const [userAId, userBId] = [userId, partnerUserId].sort((a, b) => a.localeCompare(b));

    const [created] = await db
      .insert(callSessions)
      .values({
        roomId,
        userAId,
        userBId,
      })
      .returning({ id: callSessions.id });

    return NextResponse.json({ callSessionId: created.id }, { status: 201 });
  } catch (error) {
    console.error("CREATE CALL SESSION ERROR:", error);
    return NextResponse.json({ message: "Failed to create call session" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = endCallSessionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { callSessionId } = parsed.data;
    const userId = session.user.id;

    const [sessionRow] = await db
      .select({
        id: callSessions.id,
      })
      .from(callSessions)
      .where(
        and(
          eq(callSessions.id, callSessionId),
          or(eq(callSessions.userAId, userId), eq(callSessions.userBId, userId)),
        ),
      )
      .limit(1);

    if (!sessionRow) {
      return NextResponse.json({ message: "Call session not found" }, { status: 404 });
    }

    await db
      .update(callSessions)
      .set({
        endedByUserId: userId,
        endedAt: new Date(),
      })
      .where(eq(callSessions.id, callSessionId));

    return NextResponse.json({ message: "Call session ended" }, { status: 200 });
  } catch (error) {
    console.error("END CALL SESSION ERROR:", error);
    return NextResponse.json({ message: "Failed to end call session" }, { status: 500 });
  }
}
