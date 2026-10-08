import { z } from "zod";
import { STATUTORY_HEADS, STATUTORY_RULE_STATUSES, TAX_REGIMES, TAX_PROOF_STATUSES } from "@/lib/constants";

export const statutoryRuleVersionSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  head: z.enum(STATUTORY_HEADS),
  versionCode: z.string().trim().min(1, "Version code is required.").max(40),
  name: z.string().trim().min(1, "Name is required.").max(120),
  jurisdiction: z.string().trim().max(40).optional().or(z.literal("")),
  stateCode: z.string().trim().max(12).optional().or(z.literal("")),
  taxYear: z.string().trim().max(12).optional().or(z.literal("")),
  regime: z.enum(TAX_REGIMES).optional().or(z.literal("")),
  effectiveFrom: z.string().min(1, "Effective from is required."),
  effectiveTo: z.string().optional().or(z.literal("")),
  status: z.enum(STATUTORY_RULE_STATUSES).optional(),
  sourceName: z.string().trim().max(160).optional().or(z.literal("")),
  sourceUrl: z.string().trim().max(400).optional().or(z.literal("")),
  sourceCitation: z.string().trim().max(400).optional().or(z.literal("")),
  configJson: z.string().trim().min(2, "Config JSON is required."),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const orgStatutorySettingsSchema = z.object({
  pfEnabled: z.boolean().optional(),
  esiEnabled: z.boolean().optional(),
  ptEnabled: z.boolean().optional(),
  lwfEnabled: z.boolean().optional(),
  tdsEnabled: z.boolean().optional(),
  pfRestrictToCeiling: z.boolean().optional(),
  defaultStateCode: z.string().trim().max(12).optional().or(z.literal("")),
  tdsDefaultRegime: z.enum(TAX_REGIMES),
  showEmployerOnPayslip: z.boolean().optional(),
});

export const taxDeclarationSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  employeeId: z.string().min(1, "Employee is required."),
  taxYear: z.string().trim().min(4, "Tax year is required.").max(12),
  regime: z.enum(TAX_REGIMES),
});

export const taxDeclarationItemSchema = z.object({
  declarationId: z.string().min(1, "Declaration is required."),
  sectionCode: z.string().trim().min(1, "Section is required.").max(40),
  name: z.string().trim().min(1, "Name is required.").max(80),
  amount: z.string().min(1, "Amount is required."),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export const taxProofReviewSchema = z.object({
  proofId: z.string().min(1, "Proof is required."),
  status: z.enum(TAX_PROOF_STATUSES),
  note: z.string().trim().max(400).optional().or(z.literal("")),
});

export const taxDeclarationReviewSchema = z.object({
  declarationId: z.string().min(1, "Declaration is required."),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(400).optional().or(z.literal("")),
});
