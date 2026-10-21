"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { previewReconciliationAction } from "@/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function ReconciliationForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(previewReconciliationAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="batchId" value={batchId} />
      <Input name="file" type="file" accept=".csv,text/csv" className="h-10 w-64" required />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Preview CSV
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
    </form>
  );
}
