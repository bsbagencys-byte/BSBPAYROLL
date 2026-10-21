import { z } from "zod";
import {
  API_SCOPES,
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_EVENT_TYPES,
  AUTOMATION_TRIGGER_TYPES,
  WEBHOOK_EVENT_TYPES,
} from "@/lib/constants";

export const preferenceSchema = z.object({
  eventType: z.enum(AUTOMATION_EVENT_TYPES),
  inApp: z.enum(["true", "false"]).optional(),
  email: z.enum(["true", "false"]).optional(),
});

export const templateSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  key: z.string().min(2, "Key is required.").max(80),
  name: z.string().min(2, "Name is required.").max(120),
  eventType: z.string().min(1, "Event is required."),
  channel: z.enum(["EMAIL", "IN_APP"]),
  subject: z.string().min(1, "Subject is required.").max(200),
  bodyText: z.string().min(1, "Body is required.").max(4000),
  bodyHtml: z.string().max(8000).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const ruleSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().min(2, "Name is required.").max(120),
  triggerType: z.enum(AUTOMATION_TRIGGER_TYPES),
  conditionField: z.string().max(80).optional().or(z.literal("")),
  conditionOp: z.enum(["eq", "neq", "contains"]).optional(),
  conditionValue: z.string().max(120).optional().or(z.literal("")),
  actionType: z.enum(AUTOMATION_ACTION_TYPES),
  actionTitle: z.string().max(160).optional().or(z.literal("")),
  actionBody: z.string().max(500).optional().or(z.literal("")),
  actionHref: z.string().max(200).optional().or(z.literal("")),
  enabled: z.enum(["true", "false"]).optional(),
  stopOnMatch: z.enum(["true", "false"]).optional(),
});

export const webhookSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().min(2, "Name is required.").max(120),
  url: z.string().url("Enter a valid HTTPS URL."),
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1, "Select at least one event."),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const apiKeySchema = z.object({
  name: z.string().min(2, "Name is required.").max(120),
  scopes: z.array(z.enum(API_SCOPES)).min(1, "Select at least one scope."),
  expiresAt: z.string().optional().or(z.literal("")),
  rateLimitPerMinute: z.coerce.number().int().min(10).max(600).optional(),
});

export const idSchema = z.object({
  id: z.string().min(1, "Record is required."),
});
