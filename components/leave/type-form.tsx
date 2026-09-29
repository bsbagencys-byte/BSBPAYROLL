"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveLeaveTypeAction } from "@/actions/leave";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LEAVE_TYPE_STATUSES } from "@/lib/constants";
import type { ActionResult, LeaveType } from "@/types";

const initial: ActionResult = { success: false };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

export function LeaveTypeForm({ row }: { row?: LeaveType }) {
  const [state, action, pending] = useActionState(saveLeaveTypeAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add leave type"}</CardTitle>
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
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              {LEAVE_TYPE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="maxCarryForward">Max carry forward</Label>
            <Input id="maxCarryForward" name="maxCarryForward" className="mt-1" defaultValue={row?.max_carry_forward ?? ""} />
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Check name="paid" label="Paid" defaultChecked={row?.paid ?? true} />
            <Check name="requiresApproval" label="Requires approval" defaultChecked={row?.requires_approval ?? true} />
            <Check name="requiresDocument" label="Requires document" defaultChecked={row?.requires_document} />
            <Check name="allowHalfDay" label="Allow half day" defaultChecked={row?.allow_half_day ?? true} />
            <Check name="allowBackdated" label="Allow backdated" defaultChecked={row?.allow_backdated} />
            <Check name="allowFuture" label="Allow future" defaultChecked={row?.allow_future ?? true} />
            <Check name="carryForwardAllowed" label="Carry forward" defaultChecked={row?.carry_forward_allowed} />
            <Check name="encashmentAllowed" label="Encashment" defaultChecked={row?.encashment_allowed} />
            <Check name="negativeBalanceAllowed" label="Negative balance" defaultChecked={row?.negative_balance_allowed} />
            <Check name="isCompOff" label="Comp-off type" defaultChecked={row?.is_comp_off} />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save type" : "Create type"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
