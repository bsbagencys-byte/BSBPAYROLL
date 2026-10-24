"use client";

import { useActionState } from "react";
import { updateAlertStatusAction } from "@/actions/analytics";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ANALYTICS_ALERT_STATUS_LABELS, ANALYTICS_ALERT_STATUSES, type AnalyticsAlertStatus } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function AlertStatusForm({ alertId, status }: { alertId: string; status: AnalyticsAlertStatus }) {
  const [state, action, pending] = useActionState(updateAlertStatusAction, initial);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="alertId" value={alertId} />
      <Select name="status" defaultValue={status} className="w-44">
        {ANALYTICS_ALERT_STATUSES.map((item) => (
          <option key={item} value={item}>
            {ANALYTICS_ALERT_STATUS_LABELS[item]}
          </option>
        ))}
      </Select>
      <Input name="note" placeholder="Note" className="w-56" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Update"}
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"} className="w-full">{state.message}</Alert> : null}
    </form>
  );
}
