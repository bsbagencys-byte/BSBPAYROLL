"use client";

import { useActionState } from "react";
import { askAssistantAction } from "@/actions/analytics";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, AnalyticsAssistantAnswer } from "@/types";

const initial: ActionResult<AnalyticsAssistantAnswer> = { success: false };

export function AssistantForm({ period }: { period: string }) {
  const [state, action, pending] = useActionState(askAssistantAction, initial);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="question">Question</Label>
        <Input id="question" name="question" placeholder="What changed in payroll cost this month?" required />
      </div>
      <div>
        <Label htmlFor="period">Period</Label>
        <Input id="period" name="period" type="month" defaultValue={period} className="w-44" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Asking..." : "Ask"}
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      {state.data?.answer ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <p>{state.data.answer}</p>
          {state.data.toolsUsed.length ? (
            <p className="mt-2 text-xs text-slate-500">Tools: {state.data.toolsUsed.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
