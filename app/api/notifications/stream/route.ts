import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const safeClose = () => {
          if (isClosed) return;
          isClosed = true;
          clearInterval(intervalId);
          try {
            controller.close();
          } catch {}
        };

        const send = (data: any) => {
          if (isClosed) return;
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        // initial event
        send({ type: "init", userId: session.user.id });

        const intervalId = setInterval(async () => {
          try {
            const [{ count }] = await db
              .select({ count: db.$count(notifications.id) })
              .from(notifications)
              .where(
                and(
                  eq(notifications.userId, session.user.id),
                  eq(notifications.isRead, false)
                )
              );

            send({
              type: "count_update",
              count: Number(count),
              at: Date.now(),
            });
          } catch (e) {
            console.error("SSE interval error", e);
            safeClose();
          }
        }, 10000);

        // VERY IMPORTANT ✅
        request.signal.addEventListener("abort", () => {
          console.log("SSE client disconnected");
          safeClose();
        });
      },
    });

    return new Response(stream, { headers });
  } catch (e) {
    console.error("SSE ERROR", e);
    return NextResponse.json(
      { message: "Failed to establish stream" },
      { status: 500 }
    );
  }
}