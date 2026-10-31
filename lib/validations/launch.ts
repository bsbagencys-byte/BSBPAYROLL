import { z } from "zod";

export const incidentSchema = z.object({
  title: z.string().trim().min(5).max(160),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  impact: z.string().trim().min(8).max(800),
  organizationId: z.string().optional().or(z.literal("")),
});

export const incidentResolveSchema = z.object({
  incidentId: z.string().min(1),
  resolution: z.string().trim().min(8).max(800),
});

export const feedbackSchema = z.object({
  pilotId: z.string().min(1),
  moduleKey: z.string().trim().min(2).max(40),
  kind: z.enum(["DEFECT", "FEATURE_REQUEST"]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  summary: z.string().trim().min(8).max(240),
  reproduction: z.string().trim().max(800).optional().or(z.literal("")),
});

export const uatResultSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["PASS", "FAIL", "BLOCKED", "NOT_TESTED"]),
  tester: z.string().trim().min(2).max(80),
  evidence: z.string().trim().max(400).optional().or(z.literal("")),
});

export const parallelCompareSchema = z.object({
  runId: z.string().min(1),
  expectedNet: z.string().trim().min(1).max(20),
  calculatedNet: z.string().trim().min(1).max(20),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const biometricRecordSchema = z.object({
  vendor: z.enum(["ESSL", "ZKTECO", "MATRIX", "GENERIC"]),
  model: z.string().trim().min(2).max(80),
  method: z.enum(["SIMULATED", "SDK_TESTED", "API_TESTED", "PHYSICAL_DEVICE_VERIFIED"]),
  advertised: z.enum(["true", "on"]).optional(),
  result: z.enum(["PASS", "PARTIAL", "FAILED", "BLOCKED", "NOT_TESTED"]),
  notes: z.string().trim().min(8).max(400),
});

export const pilotSignoffSchema = z.object({
  pilotId: z.string().min(1),
  confirm: z.enum(["true", "on"]),
});

export const checklistToggleSchema = z.object({
  itemId: z.string().min(1),
  complete: z.enum(["true", "on"]).optional(),
  evidence: z.string().trim().max(240).optional().or(z.literal("")),
});
