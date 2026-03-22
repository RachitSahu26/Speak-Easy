import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/sign-in",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },

            async authorize(credentials) {
                try {
                    console.log("Credentials:", credentials);

                    if (!credentials?.email || !credentials.password) {
                        return null;
                    }

                    const [existingUser] = await db
                        .select()
                        .from(users)
                        .where(eq(users.email, credentials.email.toLowerCase()));

                    console.log("User:", existingUser);

                    if (!existingUser) {
                        return null;
                    }

                    const validPassword = await compare(
                        credentials.password,
                        existingUser.passwordHash,
                    );

                    console.log("Password valid:", validPassword);

                    if (!validPassword) {
                        return null;
                    }

                    return {
                        id: existingUser.id.toString(), // ✅ FIX 2
                        name: existingUser.name,
                        email: existingUser.email,
                    };
                } catch (error) {
                    console.error("AUTH ERROR:", error);
                    return null; // ✅ VERY IMPORTANT
                }
            }




        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
    },
};
