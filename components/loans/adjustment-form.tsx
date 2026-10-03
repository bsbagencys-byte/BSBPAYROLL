"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { adjustLoanAction } from "@/actions/loans";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LOAN_ADJUSTMENT_KINDS, LOAN_ADJUSTMENT_KIND_LABELS } from "@/lib/constants";
import type { ActionResult, LoanScheduleItem } from "@/types";

const initial: ActionResult = { success: false };

export function LoanAdjustmentForm({ accountId, schedule }: { accountId: string; schedule: LoanScheduleItem[] }) {
  const [state, action, pending] = useActionState(adjustLoanAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust / skip / waive</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="accountId" value={accountId} />
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="kind">Adjustment</Label>
            <Select id="kind" name="kind" className="mt-1" defaultValue="DEFER">
              {LOAN_ADJUSTMENT_KINDS.map((item) => (
                <option key={item} value={item}>
                  {LOAN_ADJUSTMENT_KIND_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="scheduleId">Installment</Label>
            <Select id="scheduleId" name="scheduleId" className="mt-1">
              <option value="">None / write-off</option>
              {schedule.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.installment_number} · {item.due_date}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" className="mt-1" required />
            <FieldError>{state.errors?.reason?.[0]}</FieldError>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save adjustment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
