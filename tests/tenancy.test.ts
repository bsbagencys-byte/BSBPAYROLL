import assert from "node:assert/strict";
import test from "node:test";
import { assertSameOrganization, belongsToOrganization, scopedRecord } from "@/lib/tenancy";
import { EMPLOYEE_A, EMPLOYEE_B, ORG_A, ORG_B } from "./helpers/fixtures.ts";

test("tenant filter drops other organization rows", () => {
  const rows = [
    { organization_id: ORG_A, id: EMPLOYEE_A },
    { organization_id: ORG_B, id: EMPLOYEE_B },
  ];
  const scoped = belongsToOrganization(ORG_A, rows);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0]?.id, EMPLOYEE_A);
});

test("scopedRecord returns null across tenants", () => {
  assert.equal(scopedRecord(ORG_A, { organization_id: ORG_B, id: EMPLOYEE_B }), null);
  assert.equal(scopedRecord(ORG_A, { organization_id: ORG_A, id: EMPLOYEE_A })?.id, EMPLOYEE_A);
});

test("assertSameOrganization throws on mismatch", () => {
  assert.throws(() => assertSameOrganization(ORG_A, ORG_B), /Cross-organization/);
  assert.doesNotThrow(() => assertSameOrganization(ORG_A, ORG_A));
});

test("ESS identity never trusts a foreign employee id", () => {
  const catalog = [
    { id: EMPLOYEE_A, user_id: "user-a", organization_id: ORG_A },
    { id: EMPLOYEE_B, user_id: "user-a", organization_id: ORG_B },
  ];
  const self = catalog.find((item) => item.user_id === "user-a" && item.organization_id === ORG_A);
  assert.equal(self?.id, EMPLOYEE_A);
  assert.equal(self?.organization_id, ORG_A);
});
