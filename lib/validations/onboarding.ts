import { z } from "zod";

export const skipAttendanceSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

export const importPreviewSchema = z.object({
  entityType: z.enum([
    "EMPLOYEES",
    "SALARY",
    "LEAVE_BALANCES",
    "LOAN_BALANCES",
    "HISTORICAL_PAYROLL",
    "OPENING_BALANCES",
  ]),
});

export const importConfirmSchema = z.object({
  jobId: z.string().min(1),
  confirm: z.enum(["true", "on"]).optional(),
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(5).max(160),
  category: z.enum(["PAYROLL", "ATTENDANCE", "BILLING", "MIGRATION", "ACCESS", "OTHER"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  body: z.string().trim().min(10).max(4000),
});

export const supportReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2).max(4000),
  visibility: z.enum(["CUSTOMER", "INTERNAL"]).optional(),
});

export const supportStatusSchema = z.object({
  ticketId: z.string().min(1),
  action: z.enum(["progress", "waiting", "resolve", "close"]),
  organizationId: z.string().optional().or(z.literal("")),
});

export const dataExportSchema = z.object({
  kind: z.enum(["FULL", "EMPLOYEES", "PAYROLL", "LEAVE", "BILLING"]),
});

export const offboardingSchema = z.object({
  reason: z.string().trim().min(8).max(400),
});

export const offboardingConfirmSchema = z.object({
  requestId: z.string().min(1),
  confirm: z.enum(["true", "on"]),
});
