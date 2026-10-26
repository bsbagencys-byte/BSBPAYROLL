import assert from "node:assert/strict";
import test from "node:test";
import { quoteLoan, roundMoney } from "@/lib/loans/engine";

test("zero-interest EMI recovers principal exactly", () => {
  const quote = quoteLoan({ principal: 20000, tenureMonths: 4, interestMethod: "NONE", interestRate: 0, startDate: "2026-01-01" });
  const totalPrincipal = roundMoney(quote.schedule.reduce((sum, item) => sum + item.principal, 0));
  assert.equal(totalPrincipal, 20000);
  assert.equal(quote.interestAmount, 0);
  assert.equal(quote.schedule.length, 4);
});

test("flat interest is principal times annual rate times years", () => {
  const quote = quoteLoan({ principal: 12000, tenureMonths: 12, interestMethod: "FLAT", interestRate: 12, startDate: "2026-01-01" });
  assert.equal(quote.interestAmount, 1440);
  const recovered = roundMoney(quote.schedule.reduce((sum, item) => sum + item.principal, 0));
  assert.equal(recovered, 12000);
});

test("reducing interest schedule never over-recovers principal", () => {
  const quote = quoteLoan({ principal: 100000, tenureMonths: 12, interestMethod: "REDUCING", interestRate: 12, startDate: "2026-01-01" });
  const recovered = roundMoney(quote.schedule.reduce((sum, item) => sum + item.principal, 0));
  assert.equal(recovered, 100000);
  assert.ok(quote.interestAmount > 0);
  assert.equal(quote.schedule[quote.schedule.length - 1]?.principal > 0, true);
});
