"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { changeEmployeeStatusAction } from "@/actions/employees";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUSES, type EmployeeStatus } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function EmployeeStatusForm({ employeeId, status }: { employeeId: string; status: EmployeeStatus }) {
  const [state, action, pending] = useActionState(changeEmployeeStatusAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change status</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="employeeId" value={employeeId} />
          {state?.message ? (
            <Alert className="sm:col-span-2" variant={state.success ? "success" : "error"}>
              {state.message}
            </Alert>
          ) : null}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={status}>
              {EMPLOYEE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {EMPLOYEE_STATUS_LABELS[item]}
                </option>
              ))}
            </Select>
            <FieldError>{state?.errors?.status?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="effectiveDate">Effective date</Label>
            <Input id="effectiveDate" name="effectiveDate" type="date" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update status
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
