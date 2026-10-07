"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { acknowledgePayrollExceptionAction } from "@/actions/payroll";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PayrollAcknowledgeForm({ exceptionId }: { exceptionId: string }) {
  const [state, action, pending] = useActionState(acknowledgePayrollExceptionAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <Input name="note" placeholder="Acknowledge note" className="h-8 w-44" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Acknowledge
      </Button>
      {state.message && !state.success ? <Alert variant="error">{state.message}</Alert> : null}
    </form>
  );
}
