"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { recordLoanRepaymentAction } from "@/actions/loans";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LOAN_PAYMENT_METHODS, LOAN_PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { ActionResult, LoanAccountListItem } from "@/types";

const initial: ActionResult = { success: false };

export function LoanRepaymentForm({ accounts, lockedAccountId }: { accounts: LoanAccountListItem[]; lockedAccountId?: string }) {
  const [state, action, pending] = useActionState(recordLoanRepaymentAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record repayment</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          {lockedAccountId ? <input type="hidden" name="accountId" value={lockedAccountId} /> : null}
          {!lockedAccountId ? (
            <div>
              <Label htmlFor="accountId">Loan</Label>
              <Select id="accountId" name="accountId" className="mt-1" required>
                <option value="">Select loan</option>
                {accounts.map((item) => (
                  <option key={item.account.id} value={item.account.id}>
                    {item.employeeName} — {item.loanTypeName}
                  </option>
                ))}
              </Select>
              <FieldError>{state.errors?.accountId?.[0]}</FieldError>
            </div>
          ) : null}
          <div>
            <Label htmlFor="paymentDate">Payment date</Label>
            <Input id="paymentDate" name="paymentDate" type="date" className="mt-1" required />
            <FieldError>{state.errors?.paymentDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" className="mt-1" required />
            <FieldError>{state.errors?.amount?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="paymentMethod">Method</Label>
            <Select id="paymentMethod" name="paymentMethod" className="mt-1" defaultValue="CASH">
              {LOAN_PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {LOAN_PAYMENT_METHOD_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save repayment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
