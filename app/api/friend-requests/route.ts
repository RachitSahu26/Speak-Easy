import { and, desc, eq, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendRequests, users, notifications } from "@/lib/db/schema";
import { sendFriendRequestSchema } from "@/lib/validations/post-call";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = sendFriendRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const senderId = session.user.id;
    const { receiverId } = parsed.data;

    if (senderId === receiverId) {
      return NextResponse.json({ message: "You cannot send a request to yourself" }, { status: 400 });
    }

    const [receiver] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1);

    if (!receiver) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const existingRelations = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId,
        status: friendRequests.status,
      })
      .from(friendRequests)
      .where(
        or(
          and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId)),
          and(eq(friendRequests.senderId, receiverId), eq(friendRequests.receiverId, senderId)),
        ),
      )
      .orderBy(desc(friendRequests.createdAt));

    const acceptedRelation = existingRelations.find((row) => row.status === "accepted");
    if (acceptedRelation) {
      return NextResponse.json({ message: "Already friends", state: "accepted" }, { status: 200 });
    }

    const pendingFromReceiver = existingRelations.find(
      (row) =>
        row.status === "pending" && row.senderId === receiverId && row.receiverId === senderId,
    );

    if (pendingFromReceiver) {
      await db
        .update(friendRequests)
        .set({
          status: "accepted",
          updatedAt: new Date(),
        })
        .where(eq(friendRequests.id, pendingFromReceiver.id));

      // Create notification for the sender that their request was accepted
      await db.insert(notifications).values({
        userId: senderId,
        type: "friend_request",
        referenceId: pendingFromReceiver.id,
      });

      return NextResponse.json(
        {
          message: "Friend request accepted",
          state: "accepted",
          requestId: pendingFromReceiver.id,
        },
        { status: 200 },
      );
    }

    const pendingFromSender = existingRelations.find(
      (row) => row.status === "pending" && row.senderId === senderId,
    );

    if (pendingFromSender) {
      return NextResponse.json(
        {
          message: "Friend request already sent",
          state: "pending",
          requestId: pendingFromSender.id,
        },
        { status: 200 },
      );
    }

    const [created] = await db
      .insert(friendRequests)
      .values({
        senderId,
        receiverId,
        status: "pending",
      })
      .returning({ id: friendRequests.id });

    // Create notification for the receiver
    await db.insert(notifications).values({
      userId: receiverId,
      type: "friend_request",
      referenceId: created.id,
    });

    return NextResponse.json(
      {
        message: "Friend request sent",
        state: "pending",
        requestId: created.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("SEND FRIEND REQUEST ERROR:", error);
    return NextResponse.json({ message: "Failed to send friend request" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const peerId = searchParams.get("peerId");

    if (!peerId) {
      return NextResponse.json({ message: "peerId is required" }, { status: 400 });
    }

    const currentUserId = session.user.id;

    const relations = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId,
        status: friendRequests.status,
      })
      .from(friendRequests)
      .where(
        or(
          and(eq(friendRequests.senderId, currentUserId), eq(friendRequests.receiverId, peerId)),
          and(eq(friendRequests.senderId, peerId), eq(friendRequests.receiverId, currentUserId)),
        ),
      )
      .orderBy(desc(friendRequests.createdAt));

    const accepted = relations.find((row) => row.status === "accepted");
    if (accepted) {
      return NextResponse.json(
        {
          state: "accepted",
          canRespond: false,
          incomingRequestId: null,
        },
        { status: 200 },
      );
    }

    const incomingPending = relations.find(
      (row) =>
        row.status === "pending" &&
        row.senderId === peerId &&
        row.receiverId === currentUserId,
    );

    if (incomingPending) {
      return NextResponse.json(
        {
          state: "pending_incoming",
          canRespond: true,
          incomingRequestId: incomingPending.id,
        },
        { status: 200 },
      );
    }

    const outgoingPending = relations.find(
      (row) =>
        row.status === "pending" &&
        row.senderId === currentUserId &&
        row.receiverId === peerId,
    );

    if (outgoingPending) {
      return NextResponse.json(
        {
          state: "pending_outgoing",
          canRespond: false,
          incomingRequestId: null,
        },
        { status: 200 },
      );
    }

    const rejected = relations.find((row) => row.status === "rejected");
    if (rejected) {
      return NextResponse.json(
        {
          state: "rejected",
          canRespond: false,
          incomingRequestId: null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        state: "none",
        canRespond: false,
        incomingRequestId: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET FRIEND REQUEST STATUS ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch request status" }, { status: 500 });
  }
}