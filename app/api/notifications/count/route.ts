import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [{ count }] = await db
      .select({ count: db.$count(notifications.id) })
      .from(notifications)
      .where(and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false)
      ));

    return NextResponse.json({ count: Number(count) }, { status: 200 });
  } catch (error) {
    console.error("GET NOTIFICATION COUNT ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch notification count" }, { status: 500 });
  }
}