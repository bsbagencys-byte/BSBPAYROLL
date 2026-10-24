"use client";

import { useActionState } from "react";
import { scanAnomaliesAction } from "@/actions/analytics";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function ScanForm({ period }: { period: string }) {
  const [state, action, pending] = useActionState(scanAnomaliesAction, initial);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="period" value={period} />
      <Button type="submit" disabled={pending}>
        {pending ? "Scanning..." : "Scan now"}
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
    </form>
  );
}
