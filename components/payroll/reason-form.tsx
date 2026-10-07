"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { cancelPayrollRunAction, rejectPayrollRunAction, returnPayrollDraftAction } from "@/actions/payroll";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function PayrollReasonForm({
  runId,
  action,
  label,
  variant = "outline",
}: {
  runId: string;
  action: "reject" | "return" | "cancel";
  label: string;
  variant?: "outline" | "destructive";
}) {
  const handler = action === "reject" ? rejectPayrollRunAction : action === "return" ? returnPayrollDraftAction : cancelPayrollRunAction;
  const [state, formAction, pending] = useActionState(handler, initial);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="runId" value={runId} />
      <Input name="reason" placeholder="Reason (required)" className="h-8 w-52" required />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {label}
      </Button>
      {state.message && !state.success ? <Alert variant="error">{state.message}</Alert> : null}
    </form>
  );
}
