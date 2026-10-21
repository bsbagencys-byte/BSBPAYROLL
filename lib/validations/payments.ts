import { z } from "zod";
import { PAYMENT_METHODS, PAYMENT_TRANSACTION_STATUSES } from "@/lib/constants";

const bankColumnKeys = [
  "employee_code",
  "account_holder_name",
  "account_number",
  "ifsc",
  "amount",
  "reference",
  "remarks",
] as const;

export const paymentBatchSchema = z.object({
  runId: z.string().min(1, "Payroll run is required."),
  paymentDate: z.string().min(1, "Payment date is required."),
  paymentMethod: z.enum(PAYMENT_METHODS),
  bankAccountReference: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const paymentExcludeSchema = z.object({
  batchId: z.string().min(1, "Payment batch is required."),
  itemId: z.string().min(1, "Payment item is required."),
  reason: z.string().trim().min(3, "A reason is required.").max(400),
});

export const paymentIncludeSchema = z.object({
  batchId: z.string().min(1, "Payment batch is required."),
  itemId: z.string().min(1, "Payment item is required."),
});

export const paymentBatchIdSchema = z.object({
  batchId: z.string().min(1, "Payment batch is required."),
  duplicate: z.union([z.literal("on"), z.literal("true"), z.literal(""), z.boolean()]).optional(),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const paymentCancelSchema = z.object({
  batchId: z.string().min(1, "Payment batch is required."),
  reason: z.string().trim().min(3, "A cancel reason is required.").max(400),
});

export const paymentOutcomeSchema = z.object({
  batchId: z.string().min(1, "Payment batch is required."),
  itemId: z.string().min(1, "Payment item is required."),
  status: z.enum(PAYMENT_TRANSACTION_STATUSES),
  paymentDate: z.string().min(1, "Payment date is required."),
  amount: z.string().optional().or(z.literal("")),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  bankReference: z.string().trim().max(80).optional().or(z.literal("")),
  failureReason: z.string().trim().max(400).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const paymentSettingsSchema = z.object({
  defaultMethod: z.enum(PAYMENT_METHODS),
  bankAccountReference: z.string().trim().max(80).optional().or(z.literal("")),
  filePrefix: z.string().trim().min(1, "File prefix is required.").max(40),
  includeHeader: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.boolean()]).optional(),
  columns: z.array(z.enum(bankColumnKeys)).min(1, "At least one bank-file column is required."),
});

export const reconciliationPreviewSchema = z.object({
  batchId: z.string().min(1, "Payment batch is required."),
});

export const reconciliationConfirmSchema = z.object({
  reconciliationId: z.string().min(1, "Reconciliation preview is required."),
  batchId: z.string().min(1, "Payment batch is required."),
});
