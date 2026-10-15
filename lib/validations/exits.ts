import { z } from "zod";
import {
  CLEARANCE_DEPARTMENTS,
  CLEARANCE_TASK_STATUSES,
  CONTRACTOR_BUSINESS_TYPES,
  CONTRACTOR_INVOICE_STATUSES,
  CONTRACTOR_STATUSES,
  ENGAGEMENT_FREQUENCIES,
  ENGAGEMENT_RATE_UNITS,
  ENGAGEMENT_STATUSES,
  EXIT_TYPES,
  SETTLEMENT_LINE_DIRECTIONS,
  SETTLEMENT_LINE_KINDS,
  SETTLEMENT_PAYMENT_METHODS,
} from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const boolish = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional();

export const exitSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  exitType: z.enum(EXIT_TYPES),
  noticeDate: z.string().min(1, "Notice date is required."),
  lastWorkingDate: z.string().min(1, "Last working date is required."),
  noticePeriodDays: z.string().min(1, "Notice period is required."),
  noticeServedDays: z.string().optional().or(z.literal("")),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  remarks: z.string().trim().max(400).optional().or(z.literal("")),
  attachmentName: z.string().trim().max(200).optional().or(z.literal("")),
  approverId: optionalUuid,
});

export const exitDecisionSchema = z.object({
  exitId: z.string().min(1, "Exit is required."),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const clearanceItemSchema = z.object({
  department: z.enum(CLEARANCE_DEPARTMENTS),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  name: z.string().trim().min(1, "Name is required.").max(80),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  required: boolish,
  defaultDueDays: z.string().optional().or(z.literal("")),
});

export const clearanceTaskSchema = z.object({
  taskId: z.string().min(1, "Task is required."),
  status: z.enum(CLEARANCE_TASK_STATUSES),
  remarks: z.string().trim().max(400).optional().or(z.literal("")),
});

export const settlementCreateSchema = z.object({
  exitId: z.string().min(1, "Exit is required."),
});

export const settlementDecisionSchema = z.object({
  settlementId: z.string().min(1, "Settlement is required."),
  decision: z.enum(["APPROVED", "REJECTED", "RETURNED"]),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const settlementAdjustmentSchema = z.object({
  settlementId: z.string().min(1, "Settlement is required."),
  kind: z.enum(SETTLEMENT_LINE_KINDS),
  direction: z.enum(SETTLEMENT_LINE_DIRECTIONS),
  name: z.string().trim().min(1, "Name is required.").max(80),
  amount: z.string().min(1, "Amount is required."),
  notes: z.string().trim().min(1, "Reason is required.").max(400),
});

export const settlementPaymentSchema = z.object({
  settlementId: z.string().min(1, "Settlement is required."),
  amount: z.string().min(1, "Amount is required."),
  paymentDate: z.string().min(1, "Payment date is required."),
  method: z.enum(SETTLEMENT_PAYMENT_METHODS),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const contractorSchema = z.object({
  contractorCode: z.string().trim().min(1, "Contractor ID is required.").max(24),
  legalName: z.string().trim().min(1, "Legal name is required.").max(120),
  displayName: z.string().trim().min(1, "Display name is required.").max(120),
  businessType: z.enum(CONTRACTOR_BUSINESS_TYPES),
  pan: z.string().trim().max(10).optional().or(z.literal("")),
  gstin: z.string().trim().max(15).optional().or(z.literal("")),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(120).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pin: z.string().trim().max(12).optional().or(z.literal("")),
  bankName: z.string().trim().max(80).optional().or(z.literal("")),
  accountNumber: z.string().trim().max(32).optional().or(z.literal("")),
  ifsc: z.string().trim().max(16).optional().or(z.literal("")),
  reportingManagerId: optionalUuid,
  status: z.enum(CONTRACTOR_STATUSES).optional(),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  documentName: z.string().trim().max(200).optional().or(z.literal("")),
});

export const engagementSchema = z.object({
  contractorId: z.string().min(1, "Contractor is required."),
  scope: z.string().trim().min(1, "Scope is required.").max(400),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional().or(z.literal("")),
  feeAmount: z.string().min(1, "Fee / rate is required."),
  rateUnit: z.enum(ENGAGEMENT_RATE_UNITS),
  paymentFrequency: z.enum(ENGAGEMENT_FREQUENCIES),
  invoiceTerms: z.string().trim().max(400).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  status: z.enum(ENGAGEMENT_STATUSES).optional(),
});

export const invoiceSchema = z.object({
  contractorId: z.string().min(1, "Contractor is required."),
  engagementId: optionalUuid,
  invoiceNumber: z.string().trim().min(1, "Invoice number is required.").max(40),
  invoiceDate: z.string().min(1, "Invoice date is required."),
  serviceFrom: z.string().min(1, "Service period start is required."),
  serviceTo: z.string().min(1, "Service period end is required."),
  dueDate: z.string().optional().or(z.literal("")),
  grossAmount: z.string().min(1, "Gross amount is required."),
  adjustmentAmount: z.string().optional().or(z.literal("")),
  duplicateOverrideReason: z.string().trim().max(400).optional().or(z.literal("")),
  attachmentName: z.string().trim().max(200).optional().or(z.literal("")),
  status: z.enum(CONTRACTOR_INVOICE_STATUSES).optional(),
});

export const invoiceDecisionSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required."),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const invoicePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required."),
  amount: z.string().min(1, "Amount is required."),
  paymentDate: z.string().min(1, "Payment date is required."),
  method: z.enum(SETTLEMENT_PAYMENT_METHODS),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});
