"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  assignShiftAction,
  decideRegularizationAction,
  dismissExceptionAction,
  recalculateAttendanceAction,
  saveAttendancePolicyAction,
  saveShiftAction,
  submitRegularizationAction,
} from "@/actions/attendance";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PUNCH_PAIRING_MODES, SHIFT_STATUSES } from "@/lib/constants";
import type { ActionResult, AttendancePolicy, Employee, Shift } from "@/types";

const initial: ActionResult = { success: false };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

export function AttendancePolicyForm({ policy }: { policy: AttendancePolicy | null }) {
  const [state, action, pending] = useActionState(saveAttendancePolicyAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculation policy</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="graceMinutes">Grace minutes</Label>
            <Input id="graceMinutes" name="graceMinutes" className="mt-1" defaultValue={policy?.grace_minutes ?? 15} required />
          </div>
          <div>
            <Label htmlFor="breakMinutes">Break minutes</Label>
            <Input id="breakMinutes" name="breakMinutes" className="mt-1" defaultValue={policy?.break_minutes ?? 60} required />
          </div>
          <div>
            <Label htmlFor="fullDayMinutes">Full-day minutes</Label>
            <Input id="fullDayMinutes" name="fullDayMinutes" className="mt-1" defaultValue={policy?.full_day_minutes ?? 480} required />
          </div>
          <div>
            <Label htmlFor="halfDayMinutes">Half-day minutes</Label>
            <Input id="halfDayMinutes" name="halfDayMinutes" className="mt-1" defaultValue={policy?.half_day_minutes ?? 240} required />
          </div>
          <div>
            <Label htmlFor="otMinimumMinutes">OT minimum minutes</Label>
            <Input id="otMinimumMinutes" name="otMinimumMinutes" className="mt-1" defaultValue={policy?.ot_minimum_minutes ?? 30} required />
          </div>
          <div>
            <Label htmlFor="otRoundingMinutes">OT rounding minutes</Label>
            <Input id="otRoundingMinutes" name="otRoundingMinutes" className="mt-1" defaultValue={policy?.ot_rounding_minutes ?? 15} required />
          </div>
          <div>
            <Label htmlFor="punchPairing">Punch pairing</Label>
            <Select id="punchPairing" name="punchPairing" className="mt-1" defaultValue={policy?.punch_pairing ?? "FIRST_LAST"}>
              {PUNCH_PAIRING_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "FIRST_LAST" ? "First IN / last OUT" : "Pairwise IN/OUT"}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Check name="allowOvernight" label="Allow overnight shifts" defaultChecked={policy?.allow_overnight ?? true} />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save policy
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ShiftForm({ row }: { row?: Shift }) {
  const [state, action, pending] = useActionState(saveShiftAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add shift"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={row?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" className="mt-1" defaultValue={row?.code} required />
            <FieldError>{state.errors?.code?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="startTime">Start</Label>
            <Input id="startTime" name="startTime" className="mt-1" defaultValue={row?.start_time ?? "09:00"} required />
          </div>
          <div>
            <Label htmlFor="endTime">End</Label>
            <Input id="endTime" name="endTime" className="mt-1" defaultValue={row?.end_time ?? "18:00"} required />
          </div>
          <div>
            <Label htmlFor="breakMinutes">Break minutes</Label>
            <Input id="breakMinutes" name="breakMinutes" className="mt-1" defaultValue={row?.break_minutes ?? 60} required />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              {SHIFT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Check name="overnight" label="Overnight shift" defaultChecked={row?.overnight} />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save shift" : "Create shift"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ShiftAssignForm({ employees, shifts }: { employees: Employee[]; shifts: Shift[] }) {
  const [state, action, pending] = useActionState(assignShiftAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign shift</CardTitle>
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
            <Select id="employeeId" name="employeeId" className="mt-1" required>
              <option value="">Select</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_code} {employee.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="shiftId">Shift</Label>
            <Select id="shiftId" name="shiftId" className="mt-1" required>
              <option value="">Select</option>
              {shifts.filter((item) => item.status === "ACTIVE").map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="effectiveTo">Effective to</Label>
            <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RecalculateForm({ defaultFrom, defaultTo, employees }: { defaultFrom: string; defaultTo: string; employees: Employee[] }) {
  const [state, action, pending] = useActionState(recalculateAttendanceAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recalculate days</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-4">
          {state.message ? (
            <div className="md:col-span-4">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" className="mt-1" defaultValue={defaultFrom} required />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" className="mt-1" defaultValue={defaultTo} required />
          </div>
          <div>
            <Label htmlFor="employeeId">Employee</Label>
            <Select id="employeeId" name="employeeId" className="mt-1">
              <option value="">All</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_code} {employee.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Recalculate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RegularizationForm({ employees, lockedEmployeeId }: { employees: Employee[]; lockedEmployeeId?: string }) {
  const [state, action, pending] = useActionState(submitRegularizationAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request regularization</CardTitle>
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
            {lockedEmployeeId ? <input type="hidden" name="employeeId" value={lockedEmployeeId} /> : null}
            <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={lockedEmployeeId} disabled={Boolean(lockedEmployeeId)} required>
              <option value="">Select</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_code} {employee.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="workDate">Work date</Label>
            <Input id="workDate" name="workDate" type="date" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="requestedIn">Requested IN</Label>
            <Input id="requestedIn" name="requestedIn" type="datetime-local" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="requestedOut">Requested OUT</Label>
            <Input id="requestedOut" name="requestedOut" type="datetime-local" className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" className="mt-1" required minLength={3} />
            <FieldError>{state.errors?.reason?.[0]}</FieldError>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RegularizationDecisionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(decideRegularizationAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {state.message ? <span className="text-xs text-slate-500">{state.message}</span> : null}
      <Button name="decision" value="APPROVED" size="sm" disabled={pending}>
        Approve
      </Button>
      <Button name="decision" value="REJECTED" size="sm" variant="outline" disabled={pending}>
        Reject
      </Button>
    </form>
  );
}

export function DismissExceptionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(dismissExceptionAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {state.success ? "Dismissed" : "Dismiss"}
      </Button>
    </form>
  );
}
