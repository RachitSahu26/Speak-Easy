import { db } from "@/lib/db";
import { feedbacks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function FeedbackPage({
  params,
}: {
  params: { id: string };
}) {
  const feedback = await db.query.feedbacks.findFirst({
    where: eq(feedbacks.id, params.id), // ✅ FIXED
  });

  if (!feedback) {
    return <div>Feedback not found</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Feedback</h1>

      <p><strong>Rating:</strong> {feedback.rating}</p>
      <p><strong>Comment:</strong> {feedback.comment}</p>
    </div>
  );
}