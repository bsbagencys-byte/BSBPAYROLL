"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { addTaxDeclarationItemAction, saveTaxDeclarationAction } from "@/actions/statutory";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TAX_REGIME_LABELS, TAX_REGIMES } from "@/lib/constants";
import type { ActionResult, Employee } from "@/types";

const initial: ActionResult = { success: false };

export function TaxDeclarationForm({ employees }: { employees: Employee[] }) {
  const [state, action, pending] = useActionState(saveTaxDeclarationAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New tax declaration</CardTitle>
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
                  {item.display_name} ({item.employee_code})
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="taxYear">Tax year</Label>
            <Input id="taxYear" name="taxYear" className="mt-1" placeholder="2026-27" required />
          </div>
          <div>
            <Label htmlFor="regime">Regime</Label>
            <Select id="regime" name="regime" className="mt-1" defaultValue="NEW_ACT_2025">
              {TAX_REGIMES.map((item) => (
                <option key={item} value={item}>
                  {TAX_REGIME_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TaxDeclarationItemForm({ declarationId }: { declarationId: string }) {
  const [state, action, pending] = useActionState(addTaxDeclarationItemAction, initial);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="declarationId" value={declarationId} />
      {state.message ? (
        <div className="md:col-span-4">
          <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
        </div>
      ) : null}
      <Input name="sectionCode" placeholder="Section" required />
      <Input name="name" placeholder="Name" required />
      <Input name="amount" placeholder="Amount" required />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Add item
      </Button>
    </form>
  );
}
