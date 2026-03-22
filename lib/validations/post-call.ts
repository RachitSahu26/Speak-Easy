import { z } from "zod";

export const feedbackTagValues = [
  "Friendly",
  "Helpful",
  "Rude",
  "Knowledgeable",
  "Patient",
  "Good Listener",
] as const;

export const feedbackSchema = z.object({
  callSessionId: z.string().uuid("Invalid call session id"),
  reviewedUserId: z.string().uuid("Invalid reviewed user id"),
  rating: z
    .number({ error: "Rating is required" })
    .int("Rating must be a whole number")
    .min(1, "Rating should be at least 1")
    .max(5, "Rating should be at most 5"),
  comment: z.string().trim().max(1000, "Comment is too long").optional().or(z.literal("")),
  tags: z.array(z.enum(feedbackTagValues)).max(8, "Too many tags selected").default([]),
});

export const sendFriendRequestSchema = z.object({
  receiverId: z.string().uuid("Invalid receiver id"),
});

export const respondFriendRequestSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;
