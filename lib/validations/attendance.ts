import { z } from "zod";
import { PUNCH_PAIRING_MODES, SHIFT_STATUSES } from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const boolish = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional();
const hhmm = z.string().regex(/^\d{1,2}:\d{2}$/, "Use HH:MM.");

export const attendancePolicySchema = z.object({
  graceMinutes: z.string().min(1),
  breakMinutes: z.string().min(1),
  fullDayMinutes: z.string().min(1),
  halfDayMinutes: z.string().min(1),
  otMinimumMinutes: z.string().min(1),
  otRoundingMinutes: z.string().min(1),
  punchPairing: z.enum(PUNCH_PAIRING_MODES),
  allowOvernight: boolish,
});

export const shiftSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  startTime: hhmm,
  endTime: hhmm,
  breakMinutes: z.string().min(1),
  overnight: boolish,
  status: z.enum(SHIFT_STATUSES).optional(),
});

export const shiftAssignmentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  shiftId: z.string().min(1, "Shift is required."),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
});

export const recalculateSchema = z.object({
  from: z.string().min(1, "From date is required."),
  to: z.string().min(1, "To date is required."),
  employeeId: optionalUuid,
});

export const regularizationSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  workDate: z.string().min(1, "Work date is required."),
  requestedIn: z.string().optional().or(z.literal("")),
  requestedOut: z.string().optional().or(z.literal("")),
  reason: z.string().trim().min(3, "Reason is required.").max(500),
});

export const regularizationDecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional().or(z.literal("")),
});
