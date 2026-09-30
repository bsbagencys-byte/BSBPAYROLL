"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveReimbursementAction } from "@/actions/salary";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { COMPENSATION_ENTRY_STATUSES } from "@/lib/constants";
import type { ActionResult, Employee, SalaryComponent } from "@/types";

const initial: ActionResult = { success: false };

export function ReimbursementForm({
  employees,
  components,
}: {
  employees: Employee[];
  components: SalaryComponent[];
}) {
  const [state, action, pending] = useActionState(saveReimbursementAction, initial);
  const claims = components.filter((item) => item.component_type === "REIMBURSEMENT");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record reimbursement</CardTitle>
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
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="componentId">Type</Label>
            <Select id="componentId" name="componentId" className="mt-1" required>
              <option value="">Select</option>
              {claims.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="entryDate">Date</Label>
            <Input id="entryDate" name="entryDate" type="date" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue="PENDING">
              {COMPENSATION_ENTRY_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="includeInPayroll" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Include in payroll later
          </label>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save reimbursement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
