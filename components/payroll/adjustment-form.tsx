"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createPayrollAdjustmentAction } from "@/actions/payroll";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PayrollAdjustmentForm({ runId, itemId }: { runId: string; itemId: string }) {
  const [state, action, pending] = useActionState(createPayrollAdjustmentAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Post adjustment</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="itemId" value={itemId} />
          <div>
            <Label htmlFor="kind">Kind</Label>
            <Select id="kind" name="kind" className="mt-1" defaultValue="EARNING">
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
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
            <FieldError>{state.errors?.amount?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" className="mt-1" required />
            <FieldError>{state.errors?.reason?.[0]}</FieldError>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Post adjustment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
