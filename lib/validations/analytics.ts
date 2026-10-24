import { z } from "zod";
import { ANALYTICS_ALERT_STATUSES, ANALYTICS_RULE_CODES } from "@/lib/constants";

export const analyticsPeriodSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
});

export const analyticsAlertStatusSchema = z.object({
  alertId: z.string().min(1, "Alert is required."),
  status: z.enum(ANALYTICS_ALERT_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const analyticsThresholdSchema = z.object({
  ruleCode: z.enum(ANALYTICS_RULE_CODES),
  thresholdValue: z.coerce.number().min(0).max(100000),
  enabled: z.enum(["true", "false"]).optional(),
});

export const analyticsQuestionSchema = z.object({
  question: z.string().trim().min(3, "Enter a question.").max(500),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
});
