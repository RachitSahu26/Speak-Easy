import { and, desc, eq, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendRequests, feedbacks, notifications, users } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const notificationRows = await db
      .select({ 
        id: notifications.id,
        type: notifications.type,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        referenceId: notifications.referenceId,
      })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const notificationsData = [];

    for (const row of notificationRows) {
      let senderId: string | null = null;
      let additionalData: any = {};

      if (row.type === "feedback") {
        const [feedback] = await db
          .select({
            reviewerId: feedbacks.reviewerId,
            rating: feedbacks.rating,
            comment: feedbacks.comment,
          })
          .from(feedbacks)
          .where(eq(feedbacks.id, row.referenceId))
          .limit(1);

        if (feedback) {
          senderId = feedback.reviewerId;
          additionalData = {
            rating: feedback.rating,
            comment: feedback.comment,
          };
        }
      }

      if (row.type === "friend_request") {
        const [friendRequest] = await db
          .select({
            senderId: friendRequests.senderId,
            status: friendRequests.status,
          })
          .from(friendRequests)
          .where(eq(friendRequests.id, row.referenceId))
          .limit(1);

        if (friendRequest) {
          senderId = friendRequest.senderId;
          additionalData = {
            status: friendRequest.status,
          };
        }
      }

      let senderName = "Unknown";

      if (senderId) {
        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, senderId))
          .limit(1);

        if (user) senderName = user.name;
      }

      notificationsData.push({
        id: row.id,
        type: row.type,
        isRead: row.isRead,
        createdAt: row.createdAt,
        senderName,
        referenceId: row.referenceId,
        ...additionalData,
      });
    }

    const [{ count }] = await db
      .select({ count: db.$count() })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id));

    return NextResponse.json(
      {
        notifications: notificationsData,
        total: Number(count),
        hasMore: offset + limit < Number(count),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { notificationIds } = json;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { message: "Invalid notification IDs" },
        { status: 400 }
      );
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          inArray(notifications.id, notificationIds)
        )
      );

    return NextResponse.json(
      { message: "Notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    console.error("MARK NOTIFICATIONS READ ERROR:", error);
    return NextResponse.json(
      { message: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}