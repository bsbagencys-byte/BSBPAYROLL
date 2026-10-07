"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { holdPayrollItemAction } from "@/actions/payroll";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PayrollHoldForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(holdPayrollItemAction, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <Input name="reason" placeholder="Hold reason" className="h-8 w-40" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Hold
      </Button>
      {state.message && !state.success ? <Alert variant="error">{state.message}</Alert> : null}
    </form>
  );
}
