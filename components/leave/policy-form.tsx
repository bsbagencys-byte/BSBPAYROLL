"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveLeavePolicyAction } from "@/actions/leave";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ACCRUAL_FREQUENCIES,
  ACCRUAL_METHOD_LABELS,
  ACCRUAL_METHODS,
  POLICY_SCOPE_LABELS,
  POLICY_SCOPES,
} from "@/lib/constants";
import type { ActionResult, Branch, Department, Designation, Employee, EmploymentType, LeavePolicy, LeaveType } from "@/types";

const initial: ActionResult = { success: false };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

export function LeavePolicyForm({
  types,
  branches,
  departments,
  designations,
  employmentTypes,
  employees,
  row,
}: {
  types: LeaveType[];
  branches: Branch[];
  departments: Department[];
  designations: Designation[];
  employmentTypes: EmploymentType[];
  employees: Employee[];
  row?: LeavePolicy;
}) {
  const [state, action, pending] = useActionState(saveLeavePolicyAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add leave policy"}</CardTitle>
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
            <Label htmlFor="leaveTypeId">Leave type</Label>
            <Select id="leaveTypeId" name="leaveTypeId" className="mt-1" defaultValue={row?.leave_type_id ?? ""} required>
              <option value="">Select type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="annualAllocation">Annual allocation</Label>
            <Input id="annualAllocation" name="annualAllocation" className="mt-1" defaultValue={row?.annual_allocation ?? 0} required />
          </div>
          <div>
            <Label htmlFor="startBalance">Start balance</Label>
            <Input id="startBalance" name="startBalance" className="mt-1" defaultValue={row?.start_balance ?? 0} />
          </div>
          <div>
            <Label htmlFor="accrualMethod">Accrual method</Label>
            <Select id="accrualMethod" name="accrualMethod" className="mt-1" defaultValue={row?.accrual_method ?? "ANNUAL"}>
              {ACCRUAL_METHODS.map((method) => (
                <option key={method} value={method}>
                  {ACCRUAL_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="accrualFrequency">Accrual frequency</Label>
            <Select id="accrualFrequency" name="accrualFrequency" className="mt-1" defaultValue={row?.accrual_frequency ?? "ANNUAL"}>
              {ACCRUAL_FREQUENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={row?.effective_from} required />
          </div>
          <div>
            <Label htmlFor="effectiveTo">Effective to</Label>
            <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" defaultValue={row?.effective_to ?? ""} />
          </div>
          <div>
            <Label htmlFor="scope">Scope</Label>
            <Select id="scope" name="scope" className="mt-1" defaultValue="ORGANIZATION">
              {POLICY_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {POLICY_SCOPE_LABELS[scope]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="carryForwardLimit">Carry-forward limit</Label>
            <Input id="carryForwardLimit" name="carryForwardLimit" className="mt-1" defaultValue={row?.carry_forward_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select id="branchId" name="branchId" className="mt-1">
              <option value="">None</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="departmentId">Department</Label>
            <Select id="departmentId" name="departmentId" className="mt-1">
              <option value="">None</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="designationId">Designation</Label>
            <Select id="designationId" name="designationId" className="mt-1">
              <option value="">None</option>
              {designations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="employmentTypeId">Employment type</Label>
            <Select id="employmentTypeId" name="employmentTypeId" className="mt-1">
              <option value="">None</option>
              {employmentTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="employeeId">Employee (if scoped)</Label>
            <Select id="employeeId" name="employeeId" className="mt-1">
              <option value="">None</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Check name="carryForward" label="Carry forward" defaultChecked={row?.carry_forward} />
            <Check name="encashment" label="Encashment" defaultChecked={row?.encashment} />
            <Check name="approvalRequired" label="Approval required" defaultChecked={row?.approval_required ?? true} />
            <Check name="countWeeklyOff" label="Count weekly off" defaultChecked={row?.count_weekly_off} />
            <Check name="countHoliday" label="Count holiday" defaultChecked={row?.count_holiday} />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save policy" : "Create policy"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
