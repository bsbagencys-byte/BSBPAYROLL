"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveExitAction } from "@/actions/exits";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EXIT_TYPES, EXIT_TYPE_LABELS } from "@/lib/constants";
import type { ActionResult, Employee, EmployeeExit } from "@/types";

const initial: ActionResult<{ exitId: string }> = { success: false };

export function ExitForm({ row, employees }: { row?: EmployeeExit; employees: Employee[] }) {
  const [state, action, pending] = useActionState(saveExitAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.reference_number ?? "exit"}` : "New employee exit"}</CardTitle>
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
            <Label htmlFor="employeeId">Employee</Label>
            <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={row?.employee_id ?? ""} required>
              <option value="">Select employee</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name} ({item.employee_code})
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="exitType">Exit type</Label>
            <Select id="exitType" name="exitType" className="mt-1" defaultValue={row?.exit_type ?? "RESIGNATION"} required>
              {EXIT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {EXIT_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="noticeDate">Notice date</Label>
            <Input id="noticeDate" name="noticeDate" type="date" className="mt-1" defaultValue={row?.notice_date ?? ""} required />
            <FieldError>{state.errors?.noticeDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="lastWorkingDate">Last working date</Label>
            <Input id="lastWorkingDate" name="lastWorkingDate" type="date" className="mt-1" defaultValue={row?.last_working_date ?? ""} required />
            <FieldError>{state.errors?.lastWorkingDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="noticePeriodDays">Notice period (days)</Label>
            <Input id="noticePeriodDays" name="noticePeriodDays" className="mt-1" defaultValue={row?.notice_period_days ?? 30} required />
          </div>
          <div>
            <Label htmlFor="noticeServedDays">Notice served (days)</Label>
            <Input id="noticeServedDays" name="noticeServedDays" className="mt-1" defaultValue={row?.notice_served_days ?? 0} />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" className="mt-1" defaultValue={row?.reason ?? ""} />
          </div>
          <div>
            <Label htmlFor="attachmentName">Attachment name</Label>
            <Input id="attachmentName" name="attachmentName" className="mt-1" defaultValue={row?.attachment_name ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input id="remarks" name="remarks" className="mt-1" defaultValue={row?.remarks ?? ""} />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button type="submit" name="submit" value="true" variant="secondary" disabled={pending}>
              Save and submit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
