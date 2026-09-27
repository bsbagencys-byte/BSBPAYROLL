"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveMappingAction } from "@/actions/biometric";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult, BiometricDevice, Employee } from "@/types";

const initial: ActionResult = { success: false };

export function MappingForm({
  devices,
  employees,
  defaultDeviceId,
  defaultUserId,
}: {
  devices: BiometricDevice[];
  employees: Employee[];
  defaultDeviceId?: string;
  defaultUserId?: string;
}) {
  const [state, action, pending] = useActionState(saveMappingAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Map device user</CardTitle>
      </CardHeader>
      <CardContent>
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        <form action={action} className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="deviceId">Device</Label>
            <Select id="deviceId" name="deviceId" className="mt-1" defaultValue={defaultDeviceId ?? devices[0]?.id ?? ""}>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.deviceId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="deviceUserId">Device user ID</Label>
            <Input id="deviceUserId" name="deviceUserId" className="mt-1" defaultValue={defaultUserId ?? ""} required />
            <FieldError>{state.errors?.deviceUserId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="employeeId">Employee</Label>
            <Select id="employeeId" name="employeeId" className="mt-1" defaultValue="">
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name} ({employee.employee_code})
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save mapping
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
