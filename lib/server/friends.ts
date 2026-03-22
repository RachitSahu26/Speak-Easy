import { and, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { friendRequests } from "@/lib/db/schema";

export async function areUsersFriends(userId: string, otherUserId: string) {
  const [relation] = await db
    .select({ id: friendRequests.id })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, "accepted"),
        or(
          and(eq(friendRequests.senderId, userId), eq(friendRequests.receiverId, otherUserId)),
          and(eq(friendRequests.senderId, otherUserId), eq(friendRequests.receiverId, userId)),
        ),
      ),
    )
    .limit(1);

  return Boolean(relation);
}
