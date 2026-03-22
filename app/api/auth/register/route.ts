import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signUpSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const parsed = signUpSchema.safeParse(json);

        if (!parsed.success) {
            return NextResponse.json(
                { message: parsed.error.issues[0]?.message ?? "Invalid payload" },
                { status: 400 },
            );
        }

        const { name, email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        const [existingUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, normalizedEmail));

        if (existingUser) {
            return NextResponse.json(
                { message: "Email is already registered" },
                { status: 409 },
            );
        }

        const passwordHash = await hash(password, 10);

        await db.insert(users).values({
            name,
            email: normalizedEmail,
            passwordHash,
        });

        return NextResponse.json(
            { message: "Account created successfully" },
            { status: 201 },
        );
    }
    catch (error) {
        console.error("REGISTER ERROR:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 },
        );
    }
}


