import { z } from "zod";
import {
  LOAN_ADJUSTMENT_KINDS,
  LOAN_APPLICATION_STATUSES,
  LOAN_APPROVAL_DECISIONS,
  LOAN_CATEGORIES,
  LOAN_INTEREST_METHODS,
  LOAN_PAYMENT_METHODS,
  LOAN_WORKFLOW_MODES,
  POLICY_SCOPES,
} from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const boolish = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional();

export const loanTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  category: z.enum(LOAN_CATEGORIES),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  maxAmount: z.string().optional().or(z.literal("")),
  maxTenureMonths: z.string().optional().or(z.literal("")),
  interestMethod: z.enum(LOAN_INTEREST_METHODS),
  interestRate: z.string().optional().or(z.literal("")),
  processingFee: z.string().optional().or(z.literal("")),
  eligibility: z.string().trim().max(200).optional().or(z.literal("")),
  allowMultipleActive: boolish,
  autoDeductPayroll: boolish,
  workflowMode: z.enum(LOAN_WORKFLOW_MODES),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const loanPolicySchema = z.object({
  name: z.string().trim().min(1, "Policy name is required.").max(80),
  loanTypeId: z.string().min(1, "Loan type is required."),
  maxAmount: z.string().optional().or(z.literal("")),
  maxTenureMonths: z.string().optional().or(z.literal("")),
  maxActiveLoans: z.string().optional().or(z.literal("")),
  minServiceMonths: z.string().optional().or(z.literal("")),
  scope: z.enum(POLICY_SCOPES),
  branchId: optionalUuid,
  departmentId: optionalUuid,
  designationId: optionalUuid,
  employmentTypeId: optionalUuid,
  employeeId: optionalUuid,
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const loanApplicationSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  loanTypeId: z.string().min(1, "Loan type is required."),
  requestedAmount: z.string().min(1, "Amount is required."),
  tenureMonths: z.string().min(1, "Tenure is required."),
  interestRate: z.string().optional().or(z.literal("")),
  purpose: z.string().trim().max(200).optional().or(z.literal("")),
  requestedDate: z.string().min(1, "Requested date is required."),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  autoDeductPayroll: boolish,
  status: z.enum(LOAN_APPLICATION_STATUSES).optional(),
});

export const loanDecisionSchema = z.object({
  applicationId: z.string().min(1, "Application is required."),
  decision: z.enum(LOAN_APPROVAL_DECISIONS),
  amount: z.string().optional().or(z.literal("")),
  tenureMonths: z.string().optional().or(z.literal("")),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});

export const loanDisburseSchema = z.object({
  applicationId: z.string().min(1, "Application is required."),
  startDate: z.string().min(1, "Start date is required."),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const loanRepaymentSchema = z.object({
  accountId: z.string().min(1, "Loan account is required."),
  paymentDate: z.string().min(1, "Payment date is required."),
  amount: z.string().min(1, "Amount is required."),
  paymentMethod: z.enum(LOAN_PAYMENT_METHODS),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const loanAdjustmentSchema = z.object({
  accountId: z.string().min(1, "Loan account is required."),
  scheduleId: optionalUuid,
  kind: z.enum(LOAN_ADJUSTMENT_KINDS),
  amount: z.string().optional().or(z.literal("")),
  reason: z.string().trim().min(1, "Reason is required.").max(400),
});
