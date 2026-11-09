import { z } from "zod";
import { GEOFENCE_RADIUS_PRESETS } from "@/lib/constants";

const radiusSchema = z.coerce.number().int().min(30).max(2000);

export const smartSettingsSchema = z.object({
  enabled: z.enum(["true", "on"]).optional(),
  geofenceRadiusMeters: radiusSchema,
  accuracyThresholdMeters: z.coerce.number().int().min(10).max(500),
  freshnessSeconds: z.coerce.number().int().min(30).max(3600),
  maxTrustedDevices: z.coerce.number().int().min(1).max(5),
  requireTrustedDevice: z.enum(["true", "on"]).optional(),
  requirePreciseLocation: z.enum(["true", "on"]).optional(),
  backgroundLocationEnabled: z.enum(["true", "on"]).optional(),
  autoAcceptPolicy: z.enum(["OFF", "LOW_RISK_ONLY", "LOW_AND_MEDIUM"]),
  qrFallbackEnabled: z.enum(["true", "on"]).optional(),
  dynamicPinEnabled: z.enum(["true", "on"]).optional(),
  qrTtlSeconds: z.coerce.number().int().min(30).max(300),
  entryWindowStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  entryWindowEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  exitWindowStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  exitWindowEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  duplicateIntervalSeconds: z.coerce.number().int().min(30).max(3600),
  retentionDays: z.coerce.number().int().min(30).max(2555),
});

export const workplaceSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: radiusSchema,
  branchId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const deviceRegisterSchema = z.object({
  publicKey: z.string().trim().min(16).max(512),
  deviceModel: z.string().trim().min(2).max(80),
  osVersion: z.string().trim().min(1).max(40),
  appVersion: z.string().trim().min(1).max(40),
  attestationKind: z.enum(["NONE", "PLAY_INTEGRITY", "KEYSTORE"]).optional(),
  attestationResult: z.string().trim().max(40).optional().or(z.literal("")),
});

export const deviceActionSchema = z.object({
  deviceId: z.string().min(1),
  reason: z.string().trim().max(240).optional().or(z.literal("")),
});

export const geofenceEventSchema = z.object({
  deviceId: z.string().min(1),
  workplaceId: z.string().min(1),
  kind: z.enum(["ENTER", "EXIT", "DWELL"]),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(5000),
  occurredAt: z.string().min(10),
  permissionStatus: z.enum(["GRANTED", "APPROXIMATE", "DENIED", "RESTRICTED"]),
  mockLocation: z.boolean().optional(),
  integrityResult: z.string().trim().max(40).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120),
  signature: z.string().trim().min(16).max(512),
});

export const qrCreateSchema = z.object({
  workplaceId: z.string().min(1),
  direction: z.enum(["IN", "OUT"]),
});

export const qrScanSchema = z.object({
  token: z.string().trim().min(16).max(200),
  pin: z.string().trim().max(12).optional().or(z.literal("")),
  deviceId: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(5000),
  occurredAt: z.string().min(10),
  mockLocation: z.boolean().optional(),
  integrityResult: z.string().trim().max(40).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(120),
  signature: z.string().trim().min(16).max(512),
});

export const verificationSchema = z.object({
  eventId: z.string().min(1),
  method: z.enum(["DEVICE_BIOMETRIC", "DYNAMIC_PIN", "FACE_PROVIDER", "HR_REVIEW"]),
  outcome: z.enum(["PASSED", "FAILED", "SKIPPED", "UNAVAILABLE"]),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
});

export const correctionSchema = z.object({
  eventId: z.string().min(1),
  notes: z.string().trim().min(8).max(400),
});

export { GEOFENCE_RADIUS_PRESETS };
