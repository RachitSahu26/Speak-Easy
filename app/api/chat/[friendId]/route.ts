import { and, asc, eq, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatMessages, users } from "@/lib/db/schema";
import { areUsersFriends } from "@/lib/server/friends";
import { chatMessageSchema } from "@/lib/validations/chat";

type Params = {
  params: Promise<{
    friendId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { friendId } = await params;
    const userId = session.user.id;

    const [friend] = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, friendId))
      .limit(1);

    if (!friend) {
      return NextResponse.json({ message: "Friend not found" }, { status: 404 });
    }

    const isFriend = await areUsersFriends(userId, friendId);
    if (!isFriend) {
      return NextResponse.json({ message: "Chat allowed for friends only" }, { status: 403 });
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        senderId: chatMessages.senderId,
        receiverId: chatMessages.receiverId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        or(
          and(eq(chatMessages.senderId, userId), eq(chatMessages.receiverId, friendId)),
          and(eq(chatMessages.senderId, friendId), eq(chatMessages.receiverId, userId)),
        ),
      )
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json(
      {
        friend,
        messages,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET CHAT ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch chat" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { friendId } = await params;
    const userId = session.user.id;

    const isFriend = await areUsersFriends(userId, friendId);
    if (!isFriend) {
      return NextResponse.json({ message: "Chat allowed for friends only" }, { status: 403 });
    }

    const payload = await request.json();
    const parsed = chatMessageSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid message" },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(chatMessages)
      .values({
        senderId: userId,
        receiverId: friendId,
        message: parsed.data.message,
      })
      .returning({
        id: chatMessages.id,
        senderId: chatMessages.senderId,
        receiverId: chatMessages.receiverId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
      });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    console.error("SEND CHAT MESSAGE ERROR:", error);
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}
