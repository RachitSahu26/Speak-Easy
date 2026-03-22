import { z } from "zod";



export const profileStatusValues = ["Student", "Working Professional"] as const;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  status: z.enum(profileStatusValues, {
    error: "Please select your current status",
  }),
  interestAreas: z
    .string()
    .trim()
    .min(2, "Please enter at least one interest area"),
  location: z.string().trim().min(2, "Location is required"),
  futureGoal: z.string().trim().min(10, "Future goal must be at least 10 characters"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function normalizeInterestAreas(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}
