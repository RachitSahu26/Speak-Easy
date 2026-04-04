import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { callSessions, feedbacks, notifications } from "@/lib/db/schema";
import { feedbackSchema } from "@/lib/validations/post-call";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("checking that data is coming to api page or not",body)
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { callSessionId, reviewedUserId, rating, comment, tags } =
      parsed.data;

    const reviewerId = session.user.id;

    // 🚫 Prevent self-review
    if (reviewerId === reviewedUserId) {
      return NextResponse.json(
        { message: "You cannot review yourself" },
        { status: 400 }
      );
    }

    // 🔍 Get call session
    const [callSession] = await db
      .select()
      .from(callSessions)
      .where(eq(callSessions.id, callSessionId))
      .limit(1);

    if (!callSession) {
      return NextResponse.json(
        { message: "Call session not found" },
        { status: 404 }
      );
    }

    // 🔐 Validate both users belong to this call
    const users = [callSession.userAId, callSession.userBId];

    if (!users.includes(reviewerId) || !users.includes(reviewedUserId)) {
      return NextResponse.json(
        { message: "Invalid participants" },
        { status: 403 }
      );
    }

    // 🚫 Prevent duplicate feedback
    const [existing] = await db
      .select({ id: feedbacks.id })
      .from(feedbacks)
      .where(
        and(
          eq(feedbacks.callSessionId, callSessionId),
          eq(feedbacks.reviewerId, reviewerId),
          eq(feedbacks.reviewedUserId, reviewedUserId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { message: "Feedback already submitted" },
        { status: 409 }
      );
    }

    // ✅ Insert feedback
    const [newFeedback] = await db
      .insert(feedbacks)
      .values({
        callSessionId,
        reviewerId,
        reviewedUserId,
        rating,
        comment: comment?.trim() || null,
        tags,
      })
      .returning({ id: feedbacks.id });

    // 🔔 Notification
    await db.insert(notifications).values({
      userId: reviewedUserId,
      type: "feedback",
      senderName: session.user.name ?? "Anonymous",
      comment,
      referenceId: newFeedback.id,
    });

    return NextResponse.json(
      { message: "Feedback submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("SUBMIT FEEDBACK ERROR:", error);

    return NextResponse.json(
      { message: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}