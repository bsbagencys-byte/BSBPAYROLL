"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { previewLeaveAction, submitLeaveRequestAction } from "@/actions/leave";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LEAVE_DAY_SESSION_LABELS, LEAVE_DAY_SESSIONS } from "@/lib/constants";
import type { ActionResult, Employee, LeaveType } from "@/types";

const initial: ActionResult = { success: false };

export function LeaveRequestForm({
  employees,
  types,
  lockedEmployeeId,
}: {
  employees: Employee[];
  types: LeaveType[];
  lockedEmployeeId?: string | null;
}) {
  const [state, action, pending] = useActionState(submitLeaveRequestAction, initial);
  const [previewing, startPreview] = useTransition();
  const [preview, setPreview] = useState<{ total: number; available: number | null; message?: string } | null>(null);
  const activeTypes = useMemo(() => types.filter((item) => item.status === "ACTIVE"), [types]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply for leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="employeeId">Employee</Label>
            <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={lockedEmployeeId ?? ""} required disabled={Boolean(lockedEmployeeId)}>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name} ({employee.employee_code})
                </option>
              ))}
            </Select>
            {lockedEmployeeId ? <input type="hidden" name="employeeId" value={lockedEmployeeId} /> : null}
            <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="leaveTypeId">Leave type</Label>
            <Select id="leaveTypeId" name="leaveTypeId" className="mt-1" required>
              <option value="">Select type</option>
              {activeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.leaveTypeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="fromDate">From</Label>
            <Input id="fromDate" name="fromDate" type="date" className="mt-1" required />
            <FieldError>{state.errors?.fromDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="toDate">To</Label>
            <Input id="toDate" name="toDate" type="date" className="mt-1" required />
            <FieldError>{state.errors?.toDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="session">Session</Label>
            <Select id="session" name="session" className="mt-1" defaultValue="FULL">
              {LEAVE_DAY_SESSIONS.map((session) => (
                <option key={session} value={session}>
                  {LEAVE_DAY_SESSION_LABELS[session]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="contactDuringLeave">Contact during leave</Label>
            <Input id="contactDuringLeave" name="contactDuringLeave" className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" className="mt-1" />
          </div>
          {preview ? (
            <p className="md:col-span-2 text-sm text-slate-600">
              Countable days: <span className="font-medium">{preview.total}</span>
              {preview.available != null ? ` · Available ${preview.available}` : ""}
              {preview.message ? ` · ${preview.message}` : ""}
            </p>
          ) : null}
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={previewing}
              onClick={(event) => {
                const form = (event.currentTarget as HTMLButtonElement).form;
                if (!form) return;
                startPreview(async () => {
                  const result = await previewLeaveAction(new FormData(form));
                  if (!result.success) {
                    setPreview({ total: 0, available: null, message: result.message });
                    return;
                  }
                  setPreview({ total: result.data?.total ?? 0, available: result.data?.available ?? null });
                });
              }}
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Preview days
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
