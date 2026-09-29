"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { adjustBalanceAction } from "@/actions/leave";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult, Employee, LeaveType } from "@/types";

const initial: ActionResult = { success: false };

export function BalanceAdjustForm({ employees, types }: { employees: Employee[]; types: LeaveType[] }) {
  const [state, action, pending] = useActionState(adjustBalanceAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust balance</CardTitle>
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
                  {item.display_name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="leaveTypeId">Leave type</Label>
            <Select id="leaveTypeId" name="leaveTypeId" className="mt-1" required>
              <option value="">Select type</option>
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity (+ or -)</Label>
            <Input id="quantity" name="quantity" className="mt-1" required />
            <FieldError>{state.errors?.quantity?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Post adjustment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
