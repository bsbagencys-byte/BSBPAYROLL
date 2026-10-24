"use client";

import { useActionState } from "react";
import { saveThresholdAction } from "@/actions/analytics";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANALYTICS_RULE_LABELS, type AnalyticsRuleCode } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function ThresholdForm({
  ruleCode,
  value,
  canEdit,
}: {
  ruleCode: AnalyticsRuleCode;
  value: number;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(saveThresholdAction, initial);
  return (
    <form action={action} className="space-y-1 rounded border border-slate-100 p-2">
      <Label>{ANALYTICS_RULE_LABELS[ruleCode]}</Label>
      <input type="hidden" name="ruleCode" value={ruleCode} />
      <div className="flex gap-2">
        <Input name="thresholdValue" type="number" step="0.01" defaultValue={value} disabled={!canEdit} />
        {canEdit ? (
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? "..." : "Save"}
          </Button>
        ) : null}
      </div>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
    </form>
  );
}
