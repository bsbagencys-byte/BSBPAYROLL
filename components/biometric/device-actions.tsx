"use client";

import { useState, useTransition } from "react";
import { rotateDeviceTokenAction, setDeviceStatusAction } from "@/actions/biometric";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { DeviceStatus } from "@/lib/constants";

export function DeviceActions({
  deviceId,
  status,
}: {
  deviceId: string;
  status: DeviceStatus;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const disabled = status === "DISABLED";

  return (
    <div className="space-y-3">
      {message ? <Alert variant={token ? "success" : "info"}>{message}</Alert> : null}
      {token ? <p className="break-all font-mono text-xs text-slate-700">{token}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await rotateDeviceTokenAction(deviceId);
              setMessage(result.message ?? (result.success ? "Token rotated." : "Failed."));
              setToken(result.data?.token ?? null);
            })
          }
        >
          Rotate token
        </Button>
        <Button
          type="button"
          variant={disabled ? "default" : "destructive"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await setDeviceStatusAction(deviceId, disabled ? "ACTIVE" : "DISABLED");
              setMessage(result.message ?? (result.success ? "Updated." : "Failed."));
              setToken(null);
            })
          }
        >
          {disabled ? "Enable device" : "Disable device"}
        </Button>
      </div>
    </div>
  );
}
