"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { recordPaymentOutcomeAction } from "@/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAYMENT_TRANSACTION_STATUSES } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PaymentOutcomeForm({ batchId, itemId, paymentDate }: { batchId: string; itemId: string; paymentDate: string }) {
  const [state, action, pending] = useActionState(recordPaymentOutcomeAction, initial);
  return (
    <form action={action} className="grid gap-2 rounded-md border border-slate-200 p-2 md:grid-cols-6">
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="itemId" value={itemId} />
      <Select name="status" defaultValue="SUCCESS">
        {PAYMENT_TRANSACTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Input name="paymentDate" type="date" defaultValue={paymentDate} required />
      <Input name="reference" placeholder="Reference" />
      <Input name="bankReference" placeholder="Bank UTR" />
      <Input name="failureReason" placeholder="Failure reason" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Record
      </Button>
      {state.message ? (
        <div className="md:col-span-6">
          <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}
    </form>
  );
}
