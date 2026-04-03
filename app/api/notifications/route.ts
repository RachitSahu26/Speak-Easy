import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbacks, notifications } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // 🔐 check login
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // 📥 fetch notifications for this user

        const data = await db
            .select({
                id: notifications.id,
                type: notifications.type,
                isRead: notifications.isRead,
                createdAt: notifications.createdAt,
                senderName: notifications.senderName,
                comment: notifications.comment,
                referenceId: notifications.referenceId,

                // ✅ FROM FEEDBACK
                rating: feedbacks.rating,
                tag: feedbacks.tags,
            })
            .from(notifications)
            .leftJoin(
                feedbacks,
                eq(notifications.referenceId, feedbacks.id)
            )
            .where(eq(notifications.userId, session.user.id))
            .orderBy(desc(notifications.createdAt));

console.log(data);



        // 📤 send response
        return NextResponse.json({ notifications: data });

    } catch (error) {
        console.error("GET NOTIFICATIONS ERROR:", error);

        return NextResponse.json(
            { message: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}
