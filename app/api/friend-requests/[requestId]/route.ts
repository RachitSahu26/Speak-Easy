import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendRequests } from "@/lib/db/schema";
import { respondFriendRequestSchema } from "@/lib/validations/post-call";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { requestId } = await params;

    const payload = await request.json();
    const parsed = respondFriendRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid action" },
        { status: 400 }
      );
    }

    const [requestRow] = await db
      .select({
        id: friendRequests.id,
        receiverId: friendRequests.receiverId,
        status: friendRequests.status,
      })
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId))
      .limit(1);

    if (!requestRow) {
      return NextResponse.json(
        { message: "Friend request not found" },
        { status: 404 }
      );
    }

    if (requestRow.receiverId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (requestRow.status !== "pending") {
      return NextResponse.json(
        { message: `Request is already ${requestRow.status}` },
        { status: 409 }
      );
    }

    const { action } = parsed.data;

    await db
      .update(friendRequests)
      .set({
        status: action,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.receiverId, session.user.id)
        )
      );

    return NextResponse.json(
      {
        message:
          action === "accepted"
            ? "Friend request accepted"
            : "Friend request rejected",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RESPOND FRIEND REQUEST ERROR:", error);
    return NextResponse.json(
      { message: "Failed to update request" },
      { status: 500 }
    );
  }
}