import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> } // ✅ FIX
) {
  try {
    const { id } = await context.params; // ✅ VERY IMPORTANT

    console.log("PATCH ID:", id); // now it will work

    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    console.log("UPDATED:", result);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.log("PATCH ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}