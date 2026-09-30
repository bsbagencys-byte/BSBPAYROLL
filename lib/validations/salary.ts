import { z } from "zod";
import {
  COMPENSATION_ENTRY_STATUSES,
  SALARY_CALCULATION_METHODS,
  SALARY_CHANGE_TYPES,
  SALARY_COMPONENT_CATEGORIES,
  SALARY_COMPONENT_TYPES,
  SALARY_FREQUENCIES,
  SALARY_REVISION_STATUSES,
} from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const boolish = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional();

export const salaryComponentSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Code must start with a letter and use letters, numbers or underscores."),
  componentType: z.enum(SALARY_COMPONENT_TYPES),
  category: z.enum(SALARY_COMPONENT_CATEGORIES),
  calculationMethod: z.enum(SALARY_CALCULATION_METHODS),
  formula: z.string().trim().max(200).optional().or(z.literal("")),
  baseComponentId: optionalUuid,
  fixedAmount: z.string().optional().or(z.literal("")),
  percentage: z.string().optional().or(z.literal("")),
  frequency: z.enum(SALARY_FREQUENCIES),
  taxable: boolish,
  includeInCtc: boolish,
  includeInGross: boolish,
  variable: boolish,
  sortOrder: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  effectiveFrom: z.string().optional().or(z.literal("")),
  effectiveTo: z.string().optional().or(z.literal("")),
});

export const salaryStructureSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  ctcAmount: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  items: z.string().optional().or(z.literal("")),
});

export const salaryAssignmentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  structureId: z.string().min(1, "Salary structure is required."),
  ctcAmount: z.string().min(1, "CTC is required."),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  changeType: z.enum(SALARY_CHANGE_TYPES).optional(),
});

export const salaryRevisionSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  newStructureId: z.string().min(1, "New structure is required."),
  newCtc: z.string().min(1, "New CTC is required."),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  reason: z.enum(SALARY_CHANGE_TYPES),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  status: z.enum(SALARY_REVISION_STATUSES).optional(),
});

export const variableEarningSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  componentId: z.string().min(1, "Component is required."),
  amount: z.string().min(1, "Amount is required."),
  quantity: z.string().optional().or(z.literal("")),
  rate: z.string().optional().or(z.literal("")),
  periodFrom: z.string().min(1, "Period from is required."),
  periodTo: z.string().min(1, "Period to is required."),
  source: z.string().trim().max(40).optional().or(z.literal("")),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  status: z.enum(COMPENSATION_ENTRY_STATUSES).optional(),
});

export const reimbursementSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  componentId: z.string().min(1, "Component is required."),
  entryDate: z.string().min(1, "Date is required."),
  amount: z.string().min(1, "Amount is required."),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  includeInPayroll: boolish,
  status: z.enum(COMPENSATION_ENTRY_STATUSES).optional(),
});

export const formulaPreviewSchema = z.object({
  formula: z.string().trim().min(1, "Formula is required.").max(200),
});
