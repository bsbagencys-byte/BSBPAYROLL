import { z } from "zod";
import {
  BENEFIT_CALCULATION_METHODS,
  BENEFIT_CATEGORIES,
  BENEFIT_FREQUENCIES,
  BENEFIT_TAX_TREATMENTS,
  CLAIM_APPROVAL_DECISIONS,
  CLAIM_CATEGORIES,
  CLAIM_WORKFLOW_MODES,
  CITY_CATEGORIES,
  POLICY_SCOPES,
  TRAVEL_MODES,
  TRAVEL_TYPES,
} from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const boolish = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional();

export const benefitTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  category: z.enum(BENEFIT_CATEGORIES),
  calculationMethod: z.enum(BENEFIT_CALCULATION_METHODS),
  fixedAmount: z.string().optional().or(z.literal("")),
  percentage: z.string().optional().or(z.literal("")),
  frequency: z.enum(BENEFIT_FREQUENCIES),
  eligibility: z.string().trim().max(200).optional().or(z.literal("")),
  taxTreatment: z.enum(BENEFIT_TAX_TREATMENTS),
  includeInCtc: boolish,
  includeInGross: boolish,
  effectiveFrom: z.string().optional().or(z.literal("")),
  effectiveTo: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const benefitPolicySchema = z.object({
  name: z.string().trim().min(1, "Policy name is required.").max(80),
  benefitTypeId: z.string().min(1, "Benefit type is required."),
  maxAmount: z.string().optional().or(z.literal("")),
  scope: z.enum(POLICY_SCOPES),
  branchId: optionalUuid,
  departmentId: optionalUuid,
  designationId: optionalUuid,
  employmentTypeId: optionalUuid,
  employeeId: optionalUuid,
  requireAssignment: boolish,
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const employeeBenefitSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  benefitTypeId: z.string().min(1, "Benefit type is required."),
  amount: z.string().min(1, "Amount is required."),
  calculationMethod: z.enum(BENEFIT_CALCULATION_METHODS),
  percentage: z.string().optional().or(z.literal("")),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const claimTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  category: z.enum(CLAIM_CATEGORIES),
  requiresReceipt: boolish,
  requiresTravelFields: boolish,
  maxAmount: z.string().optional().or(z.literal("")),
  workflowMode: z.enum(CLAIM_WORKFLOW_MODES),
  includeInPayrollDefault: boolish,
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const claimPolicySchema = z.object({
  name: z.string().trim().min(1, "Policy name is required.").max(80),
  claimTypeId: optionalUuid,
  employeeCategory: z.string().trim().max(80).optional().or(z.literal("")),
  designationId: optionalUuid,
  cityCategory: z.enum(CITY_CATEGORIES).optional().or(z.literal("")),
  travelType: z.enum(TRAVEL_TYPES).optional().or(z.literal("")),
  daPerDay: z.string().optional().or(z.literal("")),
  mileageRate: z.string().optional().or(z.literal("")),
  localConveyanceLimit: z.string().optional().or(z.literal("")),
  hotelLimit: z.string().optional().or(z.literal("")),
  mealLimit: z.string().optional().or(z.literal("")),
  maxAmount: z.string().optional().or(z.literal("")),
  maxDays: z.string().optional().or(z.literal("")),
  requireReceipt: boolish,
  workflowMode: z.enum(CLAIM_WORKFLOW_MODES),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const claimSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  claimTypeId: z.string().min(1, "Claim type is required."),
  claimDate: z.string().min(1, "Claim date is required."),
  periodFrom: z.string().optional().or(z.literal("")),
  periodTo: z.string().optional().or(z.literal("")),
  purpose: z.string().trim().max(200).optional().or(z.literal("")),
  amount: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  referenceNumber: z.string().trim().max(40).optional().or(z.literal("")),
  overrideReason: z.string().trim().max(400).optional().or(z.literal("")),
  distance: z.string().optional().or(z.literal("")),
  ratePerKm: z.string().optional().or(z.literal("")),
  travelMode: z.enum(TRAVEL_MODES).optional().or(z.literal("")),
  travelDays: z.string().optional().or(z.literal("")),
  cityCategory: z.enum(CITY_CATEGORIES).optional().or(z.literal("")),
  travelType: z.enum(TRAVEL_TYPES).optional().or(z.literal("")),
  includeInPayroll: boolish,
  submit: boolish,
});

export const claimDecisionSchema = z.object({
  claimId: z.string().min(1, "Claim is required."),
  decision: z.enum(CLAIM_APPROVAL_DECISIONS),
  amount: z.string().optional().or(z.literal("")),
  reason: z.string().trim().max(400).optional().or(z.literal("")),
});
