import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { callSessions, chatMessages, friendRequests, users } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id;

    const relations = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId,
        connectedAt: friendRequests.updatedAt,
      })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, "accepted"),
          or(
            eq(friendRequests.senderId, currentUserId),
            eq(friendRequests.receiverId, currentUserId),
          ),
        ),
      )
      .orderBy(desc(friendRequests.updatedAt));

    const friendIds = relations.map((row) =>
      row.senderId === currentUserId ? row.receiverId : row.senderId,
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] }, { status: 200 });
    }

    const friendRows = await db
      .select({
        id: users.id,
        name: users.name,
        status: users.status,
      })
      .from(users)
      .where(inArray(users.id, friendIds));

    const messages = await db
      .select({
        senderId: chatMessages.senderId,
        receiverId: chatMessages.receiverId,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        or(
          and(eq(chatMessages.senderId, currentUserId), inArray(chatMessages.receiverId, friendIds)),
          and(eq(chatMessages.receiverId, currentUserId), inArray(chatMessages.senderId, friendIds)),
        ),
      );

    const sessions = await db
      .select({
        userAId: callSessions.userAId,
        userBId: callSessions.userBId,
        endedAt: callSessions.endedAt,
        startedAt: callSessions.startedAt,
      })
      .from(callSessions)
      .where(
        or(
          and(eq(callSessions.userAId, currentUserId), inArray(callSessions.userBId, friendIds)),
          and(eq(callSessions.userBId, currentUserId), inArray(callSessions.userAId, friendIds)),
        ),
      );

    const latestMap = new Map<string, Date>();

    for (const row of messages) {
      const friendId = row.senderId === currentUserId ? row.receiverId : row.senderId;
      const existing = latestMap.get(friendId);
      if (!existing || row.createdAt > existing) {
        latestMap.set(friendId, row.createdAt);
      }
    }

    for (const row of sessions) {
      const friendId = row.userAId === currentUserId ? row.userBId : row.userAId;
      const interactionAt = row.endedAt ?? row.startedAt;
      const existing = latestMap.get(friendId);
      if (!existing || interactionAt > existing) {
        latestMap.set(friendId, interactionAt);
      }
    }

    const relationMap = new Map<string, Date>(
      relations.map((row) => [
        row.senderId === currentUserId ? row.receiverId : row.senderId,
        row.connectedAt,
      ]),
    );

    const result = friendRows
      .map((friend) => {
        const lastInteraction = latestMap.get(friend.id) ?? relationMap.get(friend.id);
        return {
          id: friend.id,
          name: friend.name,
          status: friend.status ?? "Offline",
          lastInteraction: lastInteraction?.toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        if (!a.lastInteraction && !b.lastInteraction) return 0;
        if (!a.lastInteraction) return 1;
        if (!b.lastInteraction) return -1;
        return new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime();
      });

    return NextResponse.json({ friends: result }, { status: 200 });
  } catch (error) {
    console.error("GET FRIENDS ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch friends" }, { status: 500 });
  }
}
