import { and, desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendRequests, users } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        senderName: users.name,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(users.id, friendRequests.senderId))
      .where(
        and(eq(friendRequests.receiverId, session.user.id), eq(friendRequests.status, "pending")),
      )
      .orderBy(desc(friendRequests.createdAt));

    return NextResponse.json({ requests: rows }, { status: 200 });
  } catch (error) {
    console.error("GET PENDING FRIEND REQUESTS ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch pending requests" }, { status: 500 });
  }
}
