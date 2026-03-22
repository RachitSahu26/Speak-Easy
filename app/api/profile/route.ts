import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeInterestAreas, profileSchema } from "@/lib/validations/profile";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = profileSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid profile data" },
        { status: 400 },
      );
    }

    const { fullName, status, interestAreas, location, futureGoal } = parsed.data;

    await db
      .update(users)
      .set({
        name: fullName,
        status,
        interestAreas: normalizeInterestAreas(interestAreas),
        location,
        futureGoal,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ message: "Profile updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error);
    return NextResponse.json(
      { message: "Something went wrong while saving your profile" },
      { status: 500 },
    );
  }
}
