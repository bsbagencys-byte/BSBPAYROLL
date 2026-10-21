"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { cancelPaymentBatchAction } from "@/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PaymentCancelForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(cancelPaymentBatchAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="batchId" value={batchId} />
      <Input name="reason" placeholder="Cancel reason" className="h-8 w-52" required />
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Cancel batch
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
    </form>
  );
}
