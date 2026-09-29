import { z } from "zod";
import {
  ACCRUAL_FREQUENCIES,
  ACCRUAL_METHODS,
  COMP_OFF_STATUSES,
  HOLIDAY_TYPES,
  LEAVE_DAY_SESSIONS,
  LEAVE_TYPE_STATUSES,
  POLICY_SCOPES,
} from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const boolish = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional();

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/, "Code may only include letters, numbers, dots, hyphens and underscores."),
  paid: boolish,
  requiresApproval: boolish,
  requiresDocument: boolish,
  allowHalfDay: boolish,
  allowBackdated: boolish,
  allowFuture: boolish,
  carryForwardAllowed: boolish,
  maxCarryForward: z.string().optional().or(z.literal("")),
  encashmentAllowed: boolish,
  negativeBalanceAllowed: boolish,
  isCompOff: boolish,
  status: z.enum(LEAVE_TYPE_STATUSES).optional(),
});

export const leavePolicySchema = z.object({
  name: z.string().trim().min(1, "Policy name is required.").max(80),
  leaveTypeId: z.string().min(1, "Leave type is required."),
  annualAllocation: z.string().min(1, "Annual allocation is required."),
  accrualMethod: z.enum(ACCRUAL_METHODS),
  accrualFrequency: z.enum(ACCRUAL_FREQUENCIES),
  startBalance: z.string().optional().or(z.literal("")),
  carryForward: boolish,
  carryForwardLimit: z.string().optional().or(z.literal("")),
  encashment: boolish,
  approvalRequired: boolish,
  countWeeklyOff: boolish,
  countHoliday: boolish,
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  scope: z.enum(POLICY_SCOPES),
  branchId: optionalUuid,
  departmentId: optionalUuid,
  designationId: optionalUuid,
  employmentTypeId: optionalUuid,
  employeeId: optionalUuid,
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  leaveTypeId: z.string().min(1, "Leave type is required."),
  fromDate: z.string().min(1, "From date is required."),
  toDate: z.string().min(1, "To date is required."),
  session: z.enum(LEAVE_DAY_SESSIONS),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  contactDuringLeave: z.string().trim().max(80).optional().or(z.literal("")),
});

export const holidaySchema = z.object({
  name: z.string().trim().min(1, "Holiday name is required.").max(80),
  holidayDate: z.string().min(1, "Date is required."),
  holidayType: z.enum(HOLIDAY_TYPES),
  branchId: optionalUuid,
  locationId: optionalUuid,
  optional: boolish,
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const balanceAdjustSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  leaveTypeId: z.string().min(1, "Leave type is required."),
  quantity: z.string().min(1, "Quantity is required."),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export const compOffSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  workDate: z.string().min(1, "Work date is required."),
  source: z.enum(["HOLIDAY", "WEEKLY_OFF"]),
  units: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
  status: z.enum(COMP_OFF_STATUSES).optional(),
});
