import { z } from "zod";
import { indianPhoneSchema, pinSchema } from "@/lib/validations/company";

const optionalPhone = indianPhoneSchema.optional().or(z.literal(""));
const optionalPin = pinSchema.optional().or(z.literal(""));
const optionalEmail = z.string().trim().email("Enter a valid email address.").optional().or(z.literal(""));

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required.").max(80),
  code: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pin: optionalPin,
  phone: optionalPhone,
  email: optionalEmail,
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required.").max(80),
  code: z.string().trim().max(20).optional().or(z.literal("")),
  managerEmployeeId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export const designationSchema = z.object({
  name: z.string().trim().min(2, "Designation name is required.").max(80),
  code: z.string().trim().max(20).optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Location name is required.").max(80),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  branchId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export const employmentTypeSchema = z.object({
  name: z.string().trim().min(2, "Employment type name is required.").max(80),
  code: z.string().trim().max(20).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});
