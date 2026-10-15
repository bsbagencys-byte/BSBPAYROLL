"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { recordInvoicePaymentAction } from "@/actions/exits";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SETTLEMENT_PAYMENT_METHODS, SETTLEMENT_PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function InvoicePaymentForm({ invoiceId, outstanding }: { invoiceId: string; outstanding: number }) {
  const [state, action, pending] = useActionState(recordInvoicePaymentAction, initial);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.message ? (
        <div className="md:col-span-2">
          <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" name="amount" className="mt-1" defaultValue={outstanding} required />
      </div>
      <div>
        <Label htmlFor="paymentDate">Payment date</Label>
        <Input id="paymentDate" name="paymentDate" type="date" className="mt-1" required />
      </div>
      <div>
        <Label htmlFor="method">Method</Label>
        <Select id="method" name="method" className="mt-1" defaultValue="BANK_TRANSFER">
          {SETTLEMENT_PAYMENT_METHODS.map((item) => (
            <option key={item} value={item}>
              {SETTLEMENT_PAYMENT_METHOD_LABELS[item]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="reference">Reference</Label>
        <Input id="reference" name="reference" className="mt-1" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Record payment
        </Button>
      </div>
    </form>
  );
}
