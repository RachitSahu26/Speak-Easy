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

    // Set headers for SSE
    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', 'Cache-Control');

    const stream = new ReadableStream({
      start(controller) {
        // Send initial data
        sendEvent(controller, { type: 'init', data: { userId: session.user.id } });

        // Set up interval to check for new notifications
        const interval = setInterval(async () => {
          try {
            const [{ count }] = await db
              .select({ count: db.$count(notifications.id) })
              .from(notifications)
              .where(and(
                eq(notifications.userId, session.user.id),
                eq(notifications.isRead, false)
              ));

            sendEvent(controller, { 
              type: 'count_update', 
              data: { count: Number(count), timestamp: new Date().toISOString() } 
            });
          } catch (error) {
            console.error('SSE Error:', error);
            controller.close();
          }
        }, 10000); // Check every 10 seconds

        // Clean up when client disconnects
        const cleanup = () => {
          clearInterval(interval);
          controller.close();
        };

        // Handle client disconnect
        if (globalThis.AbortController) {
          const ac = new AbortController();
          ac.signal.addEventListener('abort', cleanup);
        }

        // Initial count
        (async () => {
          try {
            const [{ count }] = await db
              .select({ count: db.$count(notifications.id) })
              .from(notifications)
              .where(and(
                eq(notifications.userId, session.user.id),
                eq(notifications.isRead, false)
              ));

            sendEvent(controller, { 
              type: 'count_update', 
              data: { count: Number(count), timestamp: new Date().toISOString() } 
            });
          } catch (error) {
            console.error('Initial SSE Error:', error);
            controller.close();
          }
        })();
      }
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error("SSE ERROR:", error);
    return NextResponse.json({ message: "Failed to establish stream" }, { status: 500 });
  }
}

function sendEvent(controller: ReadableStreamDefaultController, data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}