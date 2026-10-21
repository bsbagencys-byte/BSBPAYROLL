"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createPaymentBatchAction } from "@/actions/payments";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { periodLabel } from "@/lib/payroll/engine";
import type { ActionResult, PaymentMethod, PayrollRun } from "@/types";

const initial: ActionResult = { success: false };

export function PaymentBatchForm({
  runs,
  defaultMethod,
  bankAccountReference,
}: {
  runs: PayrollRun[];
  defaultMethod: PaymentMethod;
  bankAccountReference: string | null;
}) {
  const [state, action, pending] = useActionState(createPaymentBatchAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create payment batch</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="runId">Finalized payroll run</Label>
            <Select id="runId" name="runId" className="mt-1" required>
              <option value="">Select run</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {periodLabel(run.period)} · net {run.total_net}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.runId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="paymentDate">Payment date</Label>
            <Input id="paymentDate" name="paymentDate" type="date" className="mt-1" required />
            <FieldError>{state.errors?.paymentDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="paymentMethod">Method</Label>
            <Select id="paymentMethod" name="paymentMethod" className="mt-1" defaultValue={defaultMethod}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="bankAccountReference">Company bank reference</Label>
            <Input id="bankAccountReference" name="bankAccountReference" className="mt-1" defaultValue={bankAccountReference ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending || runs.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create and validate
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Batches use finalized included net pay only. Invalid bank details surface as employee-level errors. Finalized salary is never changed.
        </p>
      </CardContent>
    </Card>
  );
}
