"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { assignEmployeeBenefitAction } from "@/actions/claims";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BENEFIT_CALCULATION_METHODS, BENEFIT_CALCULATION_METHOD_LABELS } from "@/lib/constants";
import type { ActionResult, BenefitType, Employee } from "@/types";

const initial: ActionResult = { success: false };

export function BenefitAssignmentForm({ types, employees }: { types: BenefitType[]; employees: Employee[] }) {
  const [state, action, pending] = useActionState(assignEmployeeBenefitAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign a benefit</CardTitle>
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
            <Label htmlFor="benefitTypeId">Benefit type</Label>
            <Select id="benefitTypeId" name="benefitTypeId" className="mt-1" required>
              <option value="">Select benefit</option>
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.benefitTypeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="calculationMethod">Calculation</Label>
            <Select id="calculationMethod" name="calculationMethod" className="mt-1" defaultValue="FIXED">
              {BENEFIT_CALCULATION_METHODS.map((item) => (
                <option key={item} value={item}>
                  {BENEFIT_CALCULATION_METHOD_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" className="mt-1" required />
            <FieldError>{state.errors?.amount?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="percentage">Percentage</Label>
            <Input id="percentage" name="percentage" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" required />
            <FieldError>{state.errors?.effectiveFrom?.[0]}</FieldError>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign benefit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
