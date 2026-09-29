"use client";

import { useActionState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { decideCompOffAction, saveCompOffAction } from "@/actions/leave";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult, CompOffEarning, Employee } from "@/types";
import type { CompOffStatus } from "@/lib/constants";

const initial: ActionResult = { success: false };

export function CompOffForm({ employees }: { employees: Employee[] }) {
  const [state, action, pending] = useActionState(saveCompOffAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record comp-off earning</CardTitle>
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
            <Label htmlFor="workDate">Work date</Label>
            <Input id="workDate" name="workDate" type="date" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="source">Source</Label>
            <Select id="source" name="source" className="mt-1" defaultValue="HOLIDAY">
              <option value="HOLIDAY">Holiday</option>
              <option value="WEEKLY_OFF">Weekly off</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="units">Units</Label>
            <Input id="units" name="units" className="mt-1" defaultValue="1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" />
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record earning
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CompOffActions({ row }: { row: CompOffEarning }) {
  const [pending, start] = useTransition();
  if (row.status !== "PENDING") return null;
  function run(status: CompOffStatus) {
    start(async () => {
      await decideCompOffAction(row.id, status);
    });
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => run("APPROVED")}>
        Approve
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("REJECTED")}>
        Reject
      </Button>
    </div>
  );
}
