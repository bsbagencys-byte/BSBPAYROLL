"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { excludePaymentItemAction } from "@/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PaymentExcludeForm({ batchId, itemId }: { batchId: string; itemId: string }) {
  const [state, action, pending] = useActionState(excludePaymentItemAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="itemId" value={itemId} />
      <Input name="reason" placeholder="Exclusion reason" className="h-8 w-44" required />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Exclude
      </Button>
      {state.message && !state.success ? <Alert variant="error">{state.message}</Alert> : null}
    </form>
  );
}
