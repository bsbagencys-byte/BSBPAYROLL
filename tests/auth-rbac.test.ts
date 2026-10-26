import assert from "node:assert/strict";
import test from "node:test";
import { passwordSchema, usernameSchema } from "@/lib/validations/auth";
import { LOGIN_RATE_LIMIT } from "@/lib/constants";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/rate-limit";
import { canCancelRun, isPayrollImmutable } from "@/lib/payroll/workflow";

test("password policy requires letter, number and special character", () => {
  assert.equal(passwordSchema.safeParse("short1!").success, false);
  assert.equal(passwordSchema.safeParse("NoNumber!").success, false);
  assert.equal(passwordSchema.safeParse("NoSpecial1").success, false);
  assert.equal(passwordSchema.safeParse("ValidPass1!").success, true);
});

test("username rejects spaces and symbols", () => {
  assert.equal(usernameSchema.safeParse("ab").success, false);
  assert.equal(usernameSchema.safeParse("bad user").success, false);
  assert.equal(usernameSchema.safeParse("bsbadmin").success, true);
});

test("login rate limit blocks after max attempts", () => {
  const key = `test-login:${Date.now()}`;
  for (let i = 0; i < LOGIN_RATE_LIMIT.maxAttempts; i += 1) {
    assert.equal(checkLoginRateLimit(key).allowed, true);
  }
  assert.equal(checkLoginRateLimit(key).allowed, false);
  clearLoginRateLimit(key);
  assert.equal(checkLoginRateLimit(key).allowed, true);
});

test("employee role cannot cancel or mutate finalized payroll", () => {
  assert.equal(canCancelRun("FINALIZED"), false);
  assert.equal(isPayrollImmutable("FINALIZED"), true);
});
