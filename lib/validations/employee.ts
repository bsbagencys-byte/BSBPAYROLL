import { z } from "zod";
import { indianPhoneSchema, panSchema, pinSchema } from "@/lib/validations/company";
import { DOCUMENT_TYPES, EMPLOYEE_STATUSES, GENDERS } from "@/lib/constants";

const optionalPhone = indianPhoneSchema.optional().or(z.literal(""));
const optionalEmail = z.string().trim().email("Enter a valid email address.").optional().or(z.literal(""));
const optionalPin = pinSchema.optional().or(z.literal(""));
const optionalUuid = z.string().uuid().optional().or(z.literal(""));

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  gender: z.enum(GENDERS).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  mobile: indianPhoneSchema,
  alternateMobile: optionalPhone,
  personalEmail: optionalEmail,
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pin: optionalPin,
  emergencyContactName: z.string().trim().max(80).optional().or(z.literal("")),
  emergencyContactNumber: optionalPhone,
  emergencyRelationship: z.string().trim().max(40).optional().or(z.literal("")),
  employeeCode: z
    .string()
    .trim()
    .min(1, "Employee ID is required.")
    .max(32)
    .regex(/^[A-Za-z0-9._-]+$/, "Employee ID may only include letters, numbers, dots, hyphens and underscores."),
  joiningDate: z.string().min(1, "Joining date is required."),
  employmentTypeId: z.string().min(1, "Employment type is required."),
  branchId: z.string().min(1, "Branch is required."),
  departmentId: optionalUuid,
  designationId: optionalUuid,
  reportingManagerId: optionalUuid,
  locationId: optionalUuid,
  status: z.enum(EMPLOYEE_STATUSES).default("ACTIVE"),
  officialEmail: optionalEmail,
  workPhone: optionalPhone,
  pan: panSchema.optional().or(z.literal("")),
  aadhaarLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the last 4 digits of Aadhaar.")
    .optional()
    .or(z.literal("")),
  uan: z.string().trim().max(20).optional().or(z.literal("")),
  esicNumber: z.string().trim().max(20).optional().or(z.literal("")),
  pfApplicable: z.boolean().optional(),
  esiApplicable: z.boolean().optional(),
  ptApplicable: z.boolean().optional(),
  accountHolderName: z.string().trim().max(80).optional().or(z.literal("")),
  bankName: z.string().trim().max(80).optional().or(z.literal("")),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Enter a valid account number.")
    .optional()
    .or(z.literal("")),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC.")
    .optional()
    .or(z.literal("")),
  bankBranchName: z.string().trim().max(80).optional().or(z.literal("")),
});

export const employeeStatusSchema = z.object({
  status: z.enum(EMPLOYEE_STATUSES),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  effectiveDate: z.string().optional().or(z.literal("")),
});

export const documentMetaSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  employeeId: z.string().uuid(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
