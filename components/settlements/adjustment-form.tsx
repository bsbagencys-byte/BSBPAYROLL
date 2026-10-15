"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { addSettlementAdjustmentAction } from "@/actions/exits";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SETTLEMENT_LINE_DIRECTIONS, SETTLEMENT_LINE_KINDS, SETTLEMENT_LINE_KIND_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function SettlementAdjustmentForm({ settlementId }: { settlementId: string }) {
  const [state, action, pending] = useActionState(addSettlementAdjustmentAction, initial);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="settlementId" value={settlementId} />
      {state.message ? (
        <div className="md:col-span-2">
          <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}
      <div>
        <Label htmlFor="kind">Kind</Label>
        <Select id="kind" name="kind" className="mt-1" defaultValue="ADJUSTMENT">
          {SETTLEMENT_LINE_KINDS.map((item) => (
            <option key={item} value={item}>
              {SETTLEMENT_LINE_KIND_LABELS[item]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="direction">Direction</Label>
        <Select id="direction" name="direction" className="mt-1" defaultValue="EARNING">
          {SETTLEMENT_LINE_DIRECTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" className="mt-1" required />
        <FieldError>{state.errors?.name?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" name="amount" className="mt-1" required />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="notes">Reason</Label>
        <Input id="notes" name="notes" className="mt-1" required />
        <FieldError>{state.errors?.notes?.[0]}</FieldError>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Add adjustment
        </Button>
      </div>
    </form>
  );
}
