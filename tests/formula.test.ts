import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFormula, validateFormula } from "@/lib/salary/formula";

test("formula parser rejects eval-like input", () => {
  assert.equal(validateFormula("BASIC; process.exit(1)").ok, false);
  assert.equal(validateFormula("Math.max(1,2)").ok, false);
  assert.equal(validateFormula("BASIC * 0.40").ok, true);
});

test("formula evaluation uses known variables only", () => {
  const result = evaluateFormula("BASIC * 0.40 + DA", { BASIC: 10000, DA: 500 });
  assert.equal(result.ok, true);
  assert.equal(result.value, 4500);
});

test("division by zero is an error", () => {
  const result = evaluateFormula("BASIC / 0", { BASIC: 100 });
  assert.equal(result.ok, false);
});
