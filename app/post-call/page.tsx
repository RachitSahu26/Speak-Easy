"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Toaster } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/client/use-toast";
import {
  feedbackSchema,
  feedbackTagValues,
  type FeedbackInput,
} from "@/lib/validations/post-call";

type FriendState =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "rejected";

type FriendStatusResponse = {
  state: FriendState;
  canRespond: boolean;
  incomingRequestId: string | null;
};

export default function PostCallPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast, toasts, dismiss } = useToast();

  const callSessionId = searchParams.get("callSessionId") ?? "";
  const partnerId = searchParams.get("partnerId") ?? "";
  const partnerName = decodeURIComponent(searchParams.get("partnerName") ?? "Partner");

  const [friendState, setFriendState] = useState<FriendStatusResponse | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  const form = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      callSessionId,
      reviewedUserId: partnerId,
      rating: 5,
      comment: "",
      tags: [],
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { isSubmitting, errors, isSubmitSuccessful },
  } = form;

  const selectedTags = watch("tags") ?? [];
  const rating = watch("rating") ?? 5;

  useEffect(() => {
    setValue("callSessionId", callSessionId);
    setValue("reviewedUserId", partnerId);
  }, [callSessionId, partnerId, setValue]);

  useEffect(() => {
    if (!partnerId) return;

    const fetchFriendStatus = async () => {
      const response = await fetch(`/api/friend-requests?peerId=${partnerId}`);
      if (!response.ok) return;
      const result = (await response.json()) as FriendStatusResponse;
      setFriendState(result);
    };

    void fetchFriendStatus();
  }, [partnerId]);

  const onSubmit = async (values: FeedbackInput) => {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      toast({
        title: result.message ?? "Unable to submit feedback",
        variant: "error",
      });
      return;
    }

    toast({
      title: result.message ?? "Feedback submitted",
      variant: "success",
    });
  };

  const onToggleTag = (tag: (typeof feedbackTagValues)[number]) => {
    const current = selectedTags;
    if (current.includes(tag)) {
      setValue(
        "tags",
        current.filter((item) => item !== tag),
      );
      return;
    }

    setValue("tags", [...current, tag]);
  };

  const sendRequest = async () => {
    if (!partnerId) return;

    setRequestLoading(true);
    const response = await fetch("/api/friend-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: partnerId,
      }),
    });

    const result = (await response.json()) as {
      message?: string;
      state?: FriendState;
    };
    setRequestLoading(false);

    if (!response.ok) {
      toast({
        title: result.message ?? "Failed to send request",
        variant: "error",
      });
      return;
    }

    toast({
      title: result.message ?? "Request updated",
      variant: "success",
    });

    setFriendState((current) => ({
      state: result.state ?? current?.state ?? "pending_outgoing",
      canRespond: false,
      incomingRequestId: null,
    }));
  };

  const respondToRequest = async (action: "accepted" | "rejected") => {
    if (!friendState?.incomingRequestId) return;

    setRequestLoading(true);
    const response = await fetch(`/api/friend-requests/${friendState.incomingRequestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    const result = (await response.json()) as { message?: string };
    setRequestLoading(false);

    if (!response.ok) {
      toast({
        title: result.message ?? "Failed to update request",
        variant: "error",
      });
      return;
    }

    toast({
      title: result.message ?? "Request updated",
      variant: "success",
    });

    setFriendState({
      state: action,
      canRespond: false,
      incomingRequestId: null,
    });
  };

  const friendStatusLabel = useMemo(() => {
    if (!friendState) return "Checking friend status...";
    switch (friendState.state) {
      case "accepted":
        return "Already Friends";
      case "pending_outgoing":
        return "Request Sent";
      case "pending_incoming":
        return "Incoming Friend Request";
      case "rejected":
        return "Request Rejected";
      default:
        return "Not connected yet";
    }
  }, [friendState]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Call Ended</CardTitle>
          <CardDescription>
            Share feedback for <span className="font-semibold text-foreground">{partnerName}</span> and connect as friends.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Feedback</CardTitle>
            <CardDescription>Rate your conversation experience.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <input type="hidden" {...register("callSessionId")} />
              <input type="hidden" {...register("reviewedUserId")} />

              <div className="space-y-2">
                <p className="text-sm font-medium">Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue("rating", value, { shouldValidate: true })}
                      className="rounded-md p-1"
                    >
                      <Star
                        className={`size-6 ${value <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
                      />
                    </button>
                  ))}
                </div>
                {errors.rating ? <p className="text-sm text-destructive">{errors.rating.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How was this person?</label>
                <textarea
                  {...register("comment")}
                  placeholder="Share your experience..."
                  className="min-h-28 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {feedbackTagValues.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <Button
                        key={tag}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => onToggleTag(tag)}
                      >
                        {active ? <Check className="size-3.5" /> : null}
                        {tag}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting || !callSessionId || !partnerId}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>

              {isSubmitSuccessful ? (
                <p className="text-sm text-emerald-600">Thanks! Your feedback has been recorded.</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Friend Request</CardTitle>
            <CardDescription>{friendStatusLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {friendState?.state === "pending_incoming" ? (
              <div className="flex gap-2">
                <Button disabled={requestLoading} onClick={() => void respondToRequest("accepted")}>
                  Accept
                </Button>
                <Button
                  variant="outline"
                  disabled={requestLoading}
                  onClick={() => void respondToRequest("rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => void sendRequest()}
                disabled={
                  requestLoading ||
                  friendState?.state === "accepted" ||
                  friendState?.state === "pending_outgoing"
                }
              >
                {requestLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Send Friend Request"
                )}
              </Button>
            )}

            <Button variant="outline" onClick={() => router.push("/dashboard/friends")}>
              Go to Friends
            </Button>
          </CardContent>
        </Card>
      </div>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
