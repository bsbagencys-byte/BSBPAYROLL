import { z } from "zod";
import { STATUTORY_HEADS } from "@/lib/constants";

export const payrollRunSchema = z.object({
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM."),
  payDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const payrollHoldSchema = z.object({
  itemId: z.string().min(1, "Payroll item is required."),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const payrollReasonSchema = z.object({
  runId: z.string().min(1, "Payroll run is required."),
  reason: z.string().trim().min(3, "A reason is required.").max(400),
});

export const payrollAdjustmentSchema = z.object({
  runId: z.string().min(1, "Payroll run is required."),
  itemId: z.string().min(1, "Payroll item is required."),
  kind: z.enum(["EARNING", "DEDUCTION"]),
  name: z.string().trim().min(1, "Name is required.").max(80),
  amount: z.string().min(1, "Amount is required."),
  reason: z.string().trim().min(3, "A reason is required.").max(400),
});

export const payrollAcknowledgeSchema = z.object({
  exceptionId: z.string().min(1, "Exception is required."),
  note: z.string().trim().max(400).optional().or(z.literal("")),
});

export const statutoryRuleSchema = z.object({
  head: z.enum(STATUTORY_HEADS),
  name: z.string().trim().min(1, "Name is required.").max(80),
  employeeRate: z.string().optional().or(z.literal("")),
  employerRate: z.string().optional().or(z.literal("")),
  wageCeiling: z.string().optional().or(z.literal("")),
  minWage: z.string().optional().or(z.literal("")),
  maxWage: z.string().optional().or(z.literal("")),
  fixedAmount: z.string().optional().or(z.literal("")),
  stateCode: z.string().trim().max(12).optional().or(z.literal("")),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});
