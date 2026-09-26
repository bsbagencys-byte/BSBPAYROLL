import { z } from "zod";

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.");

export const pinSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code.");

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (AAAAA9999A).");

export const tanSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}[0-9]{5}[A-Z]$/, "Enter a valid TAN (AAAA99999A).");

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid GSTIN.");

export const companyStep1Schema = z.object({
  name: z.string().trim().min(2, "Company name is required.").max(120),
  legalName: z.string().trim().min(2, "Legal name is required.").max(160),
  displayName: z.string().trim().min(2, "Display name is required.").max(120),
  phone: indianPhoneSchema,
  email: z.string().trim().email("Enter a valid email address."),
  addressLine1: z.string().trim().min(3, "Address is required.").max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required.").max(80),
  state: z.string().trim().min(2, "State is required.").max(80),
  pin: pinSchema,
  pan: panSchema,
  tan: tanSchema.optional().or(z.literal("")),
  gstin: gstinSchema.optional().or(z.literal("")),
});

export const companyStep2Schema = z.object({
  branchName: z.string().trim().min(2, "Branch name is required.").max(80),
  departmentName: z.string().trim().min(2, "Department name is required.").max(80),
  designationName: z.string().trim().min(2, "Designation name is required.").max(80),
});

export const companyStep3Schema = z.object({
  industry: z.string().trim().min(2, "Industry is required."),
  payrollFrequency: z.enum(["MONTHLY", "BIMONTHLY", "WEEKLY"]),
  weeklyOff: z.enum([
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]),
  timezone: z.string().min(1, "Timezone is required."),
  currency: z.string().min(1, "Currency is required."),
});

export const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username may only include letters, numbers, dots, hyphens and underscores."),
  displayName: z.string().trim().min(2, "Display name is required.").max(80),
  mobile: indianPhoneSchema.optional().or(z.literal("")),
  roleCode: z.enum(["SUPER_ADMIN", "ADMIN", "HR", "PAYROLL", "ACCOUNTANT", "MANAGER", "EMPLOYEE"]),
  branchId: z.string().uuid().optional().or(z.literal("")),
  password: z.string().optional(),
});
