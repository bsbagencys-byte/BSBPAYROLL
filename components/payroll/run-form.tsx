"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createPayrollRunAction } from "@/actions/payroll";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PayrollRunForm({ period }: { period: string }) {
  const [state, action, pending] = useActionState(createPayrollRunAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create payroll run</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-3">
          {state.message ? (
            <div className="md:col-span-3">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="period">Period</Label>
            <Input id="period" name="period" className="mt-1" defaultValue={period} required />
            <FieldError>{state.errors?.period?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="payDate">Pay date</Label>
            <Input id="payDate" name="payDate" type="date" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Calculate run
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
