"use client";

import { useActionState } from "react";
import { savePreferenceAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PreferenceForm({
  eventType,
  label,
  inApp,
  email,
}: {
  eventType: string;
  label: string;
  inApp: boolean;
  email: boolean;
}) {
  const [state, action, pending] = useActionState(savePreferenceAction, initial);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {state.message ? <p className="text-xs text-slate-500">{state.message}</p> : null}
        </div>
        <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="eventType" value={eventType} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="inApp" defaultChecked={inApp} />
            In-app
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="email" defaultChecked={email} />
            Email
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
