import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
