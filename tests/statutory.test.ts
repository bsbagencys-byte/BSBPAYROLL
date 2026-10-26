import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStatutoryBreakdown,
  defaultOrgStatutorySettings,
  indianFinancialYear,
  parseRuleConfig,
  resolveRuleVersion,
} from "@/lib/statutory/engine";
import { salarySnapshot } from "./helpers/fixtures.ts";

const now = "2026-01-15";

test("indianFinancialYear uses April start", () => {
  assert.equal(indianFinancialYear("2026-03-31"), "2025-26");
  assert.equal(indianFinancialYear("2026-04-01"), "2026-27");
});

test("unverified PF version is used but flagged", () => {
  const versions = [
    {
      id: "pf-v1",
      organization_id: null,
      head: "PF",
      version_code: "PF-UNVERIFIED",
      name: "PF",
      status: "ACTIVE",
      verified: false,
      effective_from: "2020-01-01",
      effective_to: null,
      state_code: null,
      tax_year: null,
      regime: null,
      config_json: JSON.stringify({ employeeRate: 12, employerRate: 12, wageCeiling: 15000, rounding: "NEAREST_RUPEE" }),
      source_note: null,
      created_at: now,
      updated_at: now,
    },
  ];
  const result = calculateStatutoryBreakdown({
    snapshot: salarySnapshot(20000, 0) as never,
    proratedEarnings: 25000,
    taxableEarnings: 25000,
    statutory: { pf_applicable: true, esi_applicable: false, pt_applicable: false, tds_applicable: false, lwf_applicable: false } as never,
    legacyRules: [],
    versions: versions as never,
    settings: { ...defaultOrgStatutorySettings("org", now), esi_enabled: false, pt_enabled: false, tds_enabled: false, lwf_enabled: false },
    onDate: now,
  });
  assert.equal(result.pfWage, 15000);
  assert.equal(result.pfEmployee, 1800);
  assert.equal(result.pfEmployer, 1800);
  assert.ok(result.warnings.some((item) => /not source-verified/i.test(item)));
});

test("ESI is skipped above max wage", () => {
  const versions = [
    {
      id: "esi-v1",
      organization_id: null,
      head: "ESI",
      version_code: "ESI-TEST",
      name: "ESI",
      status: "ACTIVE",
      verified: false,
      effective_from: "2020-01-01",
      effective_to: null,
      state_code: null,
      tax_year: null,
      regime: null,
      config_json: JSON.stringify({ employeeRate: 0.75, employerRate: 3.25, maxWage: 21000, minWage: 0, rounding: "NEAREST_RUPEE" }),
      source_note: null,
      created_at: now,
      updated_at: now,
    },
  ];
  const over = calculateStatutoryBreakdown({
    snapshot: salarySnapshot() as never,
    proratedEarnings: 25000,
    taxableEarnings: 25000,
    statutory: { pf_applicable: false, esi_applicable: true, pt_applicable: false, tds_applicable: false, lwf_applicable: false } as never,
    legacyRules: [],
    versions: versions as never,
    settings: { ...defaultOrgStatutorySettings("org", now), pf_enabled: false, pt_enabled: false, tds_enabled: false, lwf_enabled: false },
    onDate: now,
  });
  assert.equal(over.esiEmployee, 0);
  const inBand = calculateStatutoryBreakdown({
    snapshot: salarySnapshot() as never,
    proratedEarnings: 20000,
    taxableEarnings: 20000,
    statutory: { pf_applicable: false, esi_applicable: true, pt_applicable: false, tds_applicable: false, lwf_applicable: false } as never,
    legacyRules: [],
    versions: versions as never,
    settings: { ...defaultOrgStatutorySettings("org", now), pf_enabled: false, pt_enabled: false, tds_enabled: false, lwf_enabled: false },
    onDate: now,
  });
  assert.equal(inBand.esiEmployee, 150);
});

test("PT slabs pick the matching band", () => {
  const versions = [
    {
      id: "pt-v1",
      organization_id: null,
      head: "PT",
      version_code: "PT-KA",
      name: "PT",
      status: "ACTIVE",
      verified: false,
      effective_from: "2020-01-01",
      effective_to: null,
      state_code: "KA",
      tax_year: null,
      regime: null,
      config_json: JSON.stringify({
        slabs: [
          { from: 0, to: 15000, amount: 0 },
          { from: 15001, to: 20000, amount: 200 },
          { from: 20001, to: null, amount: 300 },
        ],
        rounding: "NEAREST_RUPEE",
      }),
      source_note: null,
      created_at: now,
      updated_at: now,
    },
  ];
  const result = calculateStatutoryBreakdown({
    snapshot: salarySnapshot() as never,
    proratedEarnings: 18000,
    taxableEarnings: 18000,
    statutory: { pf_applicable: false, esi_applicable: false, pt_applicable: true, tds_applicable: false, lwf_applicable: false, pt_state_code: "KA" } as never,
    legacyRules: [],
    versions: versions as never,
    settings: { ...defaultOrgStatutorySettings("org", now), pf_enabled: false, esi_enabled: false, tds_enabled: false, lwf_enabled: false },
    onDate: now,
  });
  assert.equal(result.ptAmount, 200);
});

test("TDS without a versioned rule stays zero and warns", () => {
  const result = calculateStatutoryBreakdown({
    snapshot: salarySnapshot() as never,
    proratedEarnings: 50000,
    taxableEarnings: 50000,
    statutory: { pf_applicable: false, esi_applicable: false, pt_applicable: false, tds_applicable: true, lwf_applicable: false } as never,
    legacyRules: [],
    versions: [],
    settings: { ...defaultOrgStatutorySettings("org", now), pf_enabled: false, esi_enabled: false, pt_enabled: false, tds_enabled: true, lwf_enabled: false },
    onDate: now,
  });
  assert.equal(result.tdsAmount, 0);
  assert.ok(result.warnings.some((item) => /TDS/i.test(item)));
});

test("resolveRuleVersion prefers the latest active match", () => {
  const versions = [
    { id: "a", head: "PF", status: "ACTIVE", effective_from: "2020-01-01", effective_to: null, version_code: "A", state_code: null, tax_year: null, regime: null },
    { id: "b", head: "PF", status: "ACTIVE", effective_from: "2025-01-01", effective_to: null, version_code: "B", state_code: null, tax_year: null, regime: null },
    { id: "c", head: "PF", status: "DISABLED", effective_from: "2026-01-01", effective_to: null, version_code: "C", state_code: null, tax_year: null, regime: null },
  ];
  const match = resolveRuleVersion(versions as never, "PF", "2026-01-15");
  assert.equal(match?.id, "b");
});

test("parseRuleConfig ignores invalid JSON", () => {
  assert.deepEqual(parseRuleConfig("not-json"), {});
});
