"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { simulatePunchAction } from "@/actions/biometric";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PUNCH_DIRECTIONS, VERIFICATION_MODES } from "@/lib/constants";
import type { ActionResult, BiometricDevice } from "@/types";

const initial: ActionResult = { success: false };

export function SimulatorForm({ devices }: { devices: BiometricDevice[] }) {
  const [state, action, pending] = useActionState(simulatePunchAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device simulator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-slate-600">
          Sends a punch through the same ingest pipeline used by live devices. This does not mark attendance or calculate payroll.
        </p>
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        <form action={action} className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="deviceId">Device</Label>
            <Select id="deviceId" name="deviceId" className="mt-1" defaultValue={devices[0]?.id ?? ""}>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="deviceUserId">Device user ID</Label>
            <Input id="deviceUserId" name="deviceUserId" className="mt-1" defaultValue="1001" required />
            <FieldError>{state.errors?.deviceUserId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="punchedAt">Punch time</Label>
            <Input id="punchedAt" name="punchedAt" type="datetime-local" className="mt-1" />
            <p className="mt-1 text-xs text-slate-500">Leave blank to use now.</p>
          </div>
          <div>
            <Label htmlFor="direction">Direction</Label>
            <Select id="direction" name="direction" className="mt-1" defaultValue="IN">
              {PUNCH_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {direction}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="verificationMode">Verification</Label>
            <Select id="verificationMode" name="verificationMode" className="mt-1" defaultValue="FINGER">
              {VERIFICATION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending || devices.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send punch
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
