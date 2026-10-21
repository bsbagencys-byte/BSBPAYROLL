"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { exportPaymentBatchAction } from "@/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function BankExportForm({ batchId, alreadyExported }: { batchId: string; alreadyExported: boolean }) {
  const [state, action, pending] = useActionState(exportPaymentBatchAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="batchId" value={batchId} />
      {alreadyExported ? (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="duplicate" value="on" required />
          Confirm duplicate export
        </label>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {alreadyExported ? "Export again" : "Export bank file"}
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
    </form>
  );
}
