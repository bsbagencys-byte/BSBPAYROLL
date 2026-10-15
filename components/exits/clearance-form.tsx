"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveClearanceItemAction } from "@/actions/exits";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CLEARANCE_DEPARTMENTS, CLEARANCE_DEPARTMENT_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function ClearanceItemForm() {
  const [state, action, pending] = useActionState(saveClearanceItemAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add clearance item</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="department">Department</Label>
            <Select id="department" name="department" className="mt-1" defaultValue="HR" required>
              {CLEARANCE_DEPARTMENTS.map((item) => (
                <option key={item} value={item}>
                  {CLEARANCE_DEPARTMENT_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" className="mt-1" required />
            <FieldError>{state.errors?.code?.[0]}</FieldError>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="defaultDueDays">Due days</Label>
            <Input id="defaultDueDays" name="defaultDueDays" className="mt-1" defaultValue="7" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="required" defaultChecked />
              Required
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save item
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
