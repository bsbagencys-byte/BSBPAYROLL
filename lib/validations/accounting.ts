import { z } from "zod";
import { ACCOUNTING_ACCOUNT_TYPES, PAYROLL_MAPPING_CATEGORIES } from "@/lib/constants";

export const ledgerAccountSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(24)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  name: z.string().trim().min(1, "Name is required.").max(80),
  accountType: z.enum(ACCOUNTING_ACCOUNT_TYPES),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const payrollMappingSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  category: z.enum(PAYROLL_MAPPING_CATEGORIES),
  componentCode: z.string().trim().max(32).optional().or(z.literal("")),
  ledgerAccountId: z.string().min(1, "Ledger account is required."),
  treatment: z.enum(["DEBIT", "CREDIT"]),
  branchId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  active: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.boolean()]).optional(),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const generateJournalSchema = z.object({
  runId: z.string().min(1, "Payroll run is required."),
  journalDate: z.string().optional().or(z.literal("")),
});

export const journalIdSchema = z.object({
  journalId: z.string().min(1, "Journal is required."),
  duplicate: z.union([z.literal("on"), z.literal("true"), z.literal(""), z.boolean()]).optional(),
});
