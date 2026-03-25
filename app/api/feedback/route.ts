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

    // 🔐 Step 1: Check login
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 📥 Step 2: Get body
    const json = await request.json();
    const parsed = feedbackSchema.safeParse(json);

    // ❌ Step 3: Validate input
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const { callSessionId, reviewedUserId, rating, comment, tags } = parsed.data;
    const reviewerId = session.user.id;

    // ❌ Step 4: Prevent self-review
    if (reviewerId === reviewedUserId) {
      return NextResponse.json(
        { message: "You cannot review yourself" },
        { status: 400 }
      );
    }

    // 🔍 Step 5: Check call session exists
    const [callSession] = await db
      .select({
        id: callSessions.id,
        userAId: callSessions.userAId,
        userBId: callSessions.userBId,
      })
      .from(callSessions)
      .where(eq(callSessions.id, callSessionId))
      .limit(1);

    if (!callSession) {
      return NextResponse.json(
        { message: "Call session not found" },
        { status: 404 }
      );
    }

    // 🔐 Step 6: Validate participants
    const isParticipant =
      callSession.userAId === reviewerId ||
      callSession.userBId === reviewerId;

    const reviewedIsParticipant =
      callSession.userAId === reviewedUserId ||
      callSession.userBId === reviewedUserId;

    if (!isParticipant || !reviewedIsParticipant) {
      return NextResponse.json(
        { message: "Invalid call session participants" },
        { status: 403 }
      );
    }

    // 🚫 Step 7: Prevent duplicate feedback
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

    // ✅ Step 8: Insert feedback + get ID
    const [newFeedback] = await db
      .insert(feedbacks)
      .values({
        callSessionId,
        reviewerId,
        reviewedUserId,
        rating,
        comment: comment?.trim() ? comment.trim() : null,
        tags,
      })
      .returning({ id: feedbacks.id });

    // 🔔 Step 9: Create notification (FIXED)
    await db.insert(notifications).values({
      userId: reviewedUserId,
      type: "feedback",
      senderName: session.user.name,
      comment,
    });
    // 🎉 Step 10: Success
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "userId is required" },
        { status: 400 }
      );
    }

    // 📊 Get ratings
    const rows = await db
      .select({
        rating: feedbacks.rating,
      })
      .from(feedbacks)
      .where(eq(feedbacks.reviewedUserId, userId));

    const total = rows.length;
    const average =
      total === 0
        ? 0
        : rows.reduce((sum, row) => sum + row.rating, 0) / total;

    return NextResponse.json(
      {
        total,
        averageRating: Number(average.toFixed(2)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET FEEDBACK SUMMARY ERROR:", error);

    return NextResponse.json(
      { message: "Failed to fetch feedback summary" },
      { status: 500 }
    );
  }
}
