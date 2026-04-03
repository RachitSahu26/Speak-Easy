"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";

const feedbackTags = ["Friendly", "Helpful", "Respectful", "Good Listener"];

export default function PostCallPage() {
  const router = useRouter();
  const params = useSearchParams();

  const callSessionId = params.get("callSessionId") ?? "";
  const partnerId = params.get("partnerId") ?? "";
  const partnerName = decodeURIComponent(
    params.get("partnerName") ?? "Partner"
  );

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [friendState, setFriendState] = useState("none");
  const [loading, setLoading] = useState(false);

  // ✅ Toggle tags (clean)
  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  // ================= FEEDBACK SUBMIT =================
  const handleSubmit = async () => {
    if (loading) return;

    if (!callSessionId || !partnerId) {
      alert("Invalid session");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callSessionId,
          reviewedUserId: partnerId,
          rating: Number(rating),
          comment,
          tags,
        }),
      });

      const data = await res.json();

      // 🔥 Handle duplicate (409)
      if (res.status === 409) {
        alert("You already submitted feedback for this call.");
        router.push("/dashboard");
        return;
      }

      if (!res.ok) {
        alert(data.message || "Something went wrong");
        return;
      }

      alert("✅ Feedback submitted!");
      router.push("/dashboard");

    } catch (err) {
      console.error("❌ ERROR:", err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ================= FRIEND REQUEST =================
  const sendRequest = async () => {
    if (!partnerId || loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/friend-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: partnerId }),
      });

      if (res.ok) {
        setFriendState("pending");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const friendLabel = useMemo(() => {
    switch (friendState) {
      case "pending":
        return "Request Sent";
      case "accepted":
        return "Already Friends";
      default:
        return "Not connected";
    }
  }, [friendState]);

  // ================= UI =================

  return (
    <div className="min-h-screen bg-[#040b1f] text-white px-6 py-16">

      {/* HEADER */}
      <div className="text-center space-y-3 mb-10">
        <h1 className="text-3xl font-semibold">Call Feedback</h1>
        <p className="text-white/60">
          Share your experience with{" "}
          <span className="text-white font-medium">{partnerName}</span>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">

        {/* FEEDBACK CARD */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-5">

          {/* Rating */}
          <div>
            <p className="text-sm text-white/60 mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <button key={num} onClick={() => setRating(num)}>
                  <Star
                    className={`size-6 ${
                      num <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <textarea
            placeholder="Write your feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full min-h-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {feedbackTags.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-lg border text-sm ${
                    active
                      ? "bg-purple-500 text-white"
                      : "bg-white/5 border-white/10 text-white/70"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 py-2"
          >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>

        {/* FRIEND CARD */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-semibold">Friend Request</h2>

          <p className="text-white/60 text-sm">{friendLabel}</p>

          <button
            onClick={sendRequest}
            disabled={loading || friendState === "pending"}
            className="w-full rounded-xl border border-white/10 py-2"
          >
            {loading ? "Sending..." : "Send Friend Request"}
          </button>

          <button
            onClick={() => router.push("/dashboard/friends")}
            className="w-full rounded-xl border border-white/10 py-2"
          >
            Go to Friends
          </button>
        </div>
      </div>
    </div>
  );
}