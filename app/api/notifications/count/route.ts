import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }

    const data = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false) // ✅ ONLY NEW
        )
      );

    return NextResponse.json({ count: data.length });
  } catch (err) {
    console.log("COUNT ERROR:", err);
    return NextResponse.json({ count: 0 });
  }
}