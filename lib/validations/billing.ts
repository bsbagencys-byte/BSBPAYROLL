import { z } from "zod";

export const planSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  billingCycleDefault: z.enum(["MONTHLY", "ANNUAL"]),
  monthlyPrice: z.coerce.number().min(0),
  annualPrice: z.coerce.number().min(0),
  currency: z.string().trim().min(3).max(8).default("INR"),
  trialDays: z.coerce.number().int().min(0).max(365),
  employeeLimit: z.coerce.number().int().min(0).optional().or(z.nan()),
  branchLimit: z.coerce.number().int().min(0).optional().or(z.nan()),
  biometricDeviceLimit: z.coerce.number().int().min(0).optional().or(z.nan()),
  modules: z.string().optional().or(z.literal("")),
  apiAccess: z.enum(["true", "false"]).optional(),
  advancedAnalytics: z.enum(["true", "false"]).optional(),
  reportsExport: z.enum(["true", "false"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "RETIRED"]),
  effectiveFrom: z.string().optional().or(z.literal("")),
  effectiveTo: z.string().optional().or(z.literal("")),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const startSubscriptionSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  startTrial: z.enum(["true", "false"]).optional(),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export const changePlanSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const cancelSubscriptionSchema = z.object({
  atPeriodEnd: z.enum(["true", "false"]).optional(),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const overrideSubscriptionSchema = z.object({
  organizationId: z.string().min(1),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED", "CANCELLED", "EXPIRED"]),
  reason: z.string().trim().min(3).max(200),
});

export const billingProfileSchema = z.object({
  legalName: z.string().trim().max(120).optional().or(z.literal("")),
  billingEmail: z.string().trim().email().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pin: z.string().trim().max(12).optional().or(z.literal("")),
  country: z.string().trim().max(4).optional().or(z.literal("")),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  pan: z.string().trim().max(12).optional().or(z.literal("")),
  taxId: z.string().trim().max(40).optional().or(z.literal("")),
});

export const platformBillingSchema = z.object({
  legalName: z.string().trim().max(120).optional().or(z.literal("")),
  billingEmail: z.string().trim().email().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pin: z.string().trim().max(12).optional().or(z.literal("")),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  pan: z.string().trim().max(12).optional().or(z.literal("")),
  taxLabel: z.string().trim().max(40).optional().or(z.literal("")),
  taxRate: z.coerce.number().min(0).max(100).optional().or(z.nan()),
  invoicePrefix: z.string().trim().min(2).max(12).default("BSB"),
  taxConfigured: z.enum(["true", "false"]).optional(),
});
