"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { assignSalaryAction } from "@/actions/salary";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SALARY_CHANGE_TYPES, SALARY_CHANGE_TYPE_LABELS } from "@/lib/constants";
import type { ActionResult, Employee, SalaryStructure } from "@/types";

const initial: ActionResult = { success: false };

export function SalaryAssignmentForm({
  employees,
  structures,
  defaultEmployeeId,
}: {
  employees: Employee[];
  structures: SalaryStructure[];
  defaultEmployeeId?: string;
}) {
  const [state, action, pending] = useActionState(assignSalaryAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign salary structure</CardTitle>
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
            <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={defaultEmployeeId ?? ""} required>
              <option value="">Select</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name} ({item.employee_code})
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="structureId">Structure</Label>
            <Select id="structureId" name="structureId" className="mt-1" required>
              <option value="">Select</option>
              {structures.filter((item) => item.status === "ACTIVE").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.structureId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="ctcAmount">Annual CTC</Label>
            <Input id="ctcAmount" name="ctcAmount" className="mt-1" required />
            <FieldError>{state.errors?.ctcAmount?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="changeType">Change type</Label>
            <Select id="changeType" name="changeType" className="mt-1" defaultValue="NEW_JOINER">
              {SALARY_CHANGE_TYPES.map((item) => (
                <option key={item} value={item}>
                  {SALARY_CHANGE_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign salary
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
