import { z } from "zod";
import { ESS_CHANGE_CATEGORIES } from "@/lib/constants";

export const changeRequestSchema = z.object({
  category: z.enum(ESS_CHANGE_CATEGORIES),
  fieldKey: z.string().trim().min(1, "Field is required.").max(80),
  currentValue: z.string().trim().max(200).optional().or(z.literal("")),
  requestedValue: z.string().trim().min(1, "Provide the corrected value.").max(200),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const changeRequestDecisionSchema = z.object({
  requestId: z.string().min(1, "Request is required."),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});
