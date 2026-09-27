import { z } from "zod";
import {
  BIOMETRIC_VENDORS,
  DEVICE_CONNECTION_MODES,
  DEVICE_STATUSES,
  PUNCH_DIRECTIONS,
  TIMEZONES,
  VERIFICATION_MODES,
} from "@/lib/constants";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));

export const deviceSchema = z.object({
  name: z.string().trim().min(1, "Device name is required.").max(80),
  vendor: z.enum(BIOMETRIC_VENDORS),
  serialNumber: z
    .string()
    .trim()
    .min(1, "Serial number is required.")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "Serial may only include letters, numbers, dots, hyphens and underscores."),
  model: z.string().trim().max(80).optional().or(z.literal("")),
  firmware: z.string().trim().max(40).optional().or(z.literal("")),
  connectionMode: z.enum(DEVICE_CONNECTION_MODES),
  branchId: optionalUuid,
  locationId: optionalUuid,
  timezone: z.enum(TIMEZONES),
  status: z.enum(DEVICE_STATUSES).optional(),
});

export const mappingSchema = z.object({
  deviceId: z.string().min(1, "Device is required."),
  deviceUserId: z
    .string()
    .trim()
    .min(1, "Device user ID is required.")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "Device user ID may only include letters, numbers, dots, hyphens and underscores."),
  employeeId: z.string().min(1, "Employee is required."),
});

export const simulatePunchSchema = z.object({
  deviceId: z.string().min(1, "Device is required."),
  deviceUserId: z.string().trim().min(1, "Device user ID is required.").max(64),
  punchedAt: z.string().optional().or(z.literal("")),
  direction: z.enum(PUNCH_DIRECTIONS).optional(),
  verificationMode: z.enum(VERIFICATION_MODES).optional(),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;
export type MappingFormValues = z.infer<typeof mappingSchema>;
export type SimulatePunchValues = z.infer<typeof simulatePunchSchema>;
