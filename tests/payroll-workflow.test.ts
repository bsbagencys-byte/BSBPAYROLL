import assert from "node:assert/strict";
import test from "node:test";
import {
  canCancelRun,
  canFinalize,
  canLockRun,
  canRecalculate,
  canUnlockRun,
  isPayrollImmutable,
} from "@/lib/payroll/workflow";

const IMMUTABLE = ["FINALIZED", "LOCKED", "PROCESSED", "PAID", "CANCELLED"] as const;

test("finalized and later statuses are immutable", () => {
  for (const status of IMMUTABLE) {
    assert.equal(isPayrollImmutable(status), true);
  }
  assert.equal(isPayrollImmutable("APPROVED"), false);
  assert.equal(isPayrollImmutable("DRAFT"), false);
});

test("recalculate is blocked after review starts", () => {
  assert.equal(canRecalculate("DRAFT"), true);
  assert.equal(canRecalculate("CALCULATED"), true);
  assert.equal(canRecalculate("UNDER_REVIEW"), false);
  assert.equal(canRecalculate("FINALIZED"), false);
});

test("cancel is blocked after finalize", () => {
  assert.equal(canCancelRun("DRAFT"), true);
  assert.equal(canCancelRun("APPROVED"), true);
  assert.equal(canCancelRun("FINALIZED"), false);
  assert.equal(canCancelRun("LOCKED"), false);
  assert.equal(canCancelRun("PROCESSED"), false);
  assert.equal(canCancelRun("PAID"), false);
});

test("lock after finalize is allowed; unlock of finalized lock is a service-level block", () => {
  assert.equal(canLockRun("CALCULATED"), true);
  assert.equal(canLockRun("FINALIZED"), true);
  assert.equal(canUnlockRun("LOCKED"), true);
  assert.equal(canFinalize("APPROVED"), true);
  assert.equal(canFinalize("FINALIZED"), false);
});
