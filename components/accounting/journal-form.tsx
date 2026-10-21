"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { generateJournalAction } from "@/actions/accounting";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { periodLabel } from "@/lib/payroll/engine";
import type { ActionResult, PayrollRun } from "@/types";

const initial: ActionResult = { success: false };

export function GenerateJournalForm({ runs }: { runs: PayrollRun[] }) {
  const [state, action, pending] = useActionState(generateJournalAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate journal</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-3">
          {state.message ? (
            <div className="md:col-span-3">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="runId">Finalized payroll run</Label>
            <Select id="runId" name="runId" className="mt-1" required>
              <option value="">Select run</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {periodLabel(run.period)} · {run.status}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.runId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="journalDate">Journal date</Label>
            <Input id="journalDate" name="journalDate" type="date" className="mt-1" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending || runs.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate from snapshot
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Journals use the finalized payroll snapshot. Unmapped components block export. Debit must equal credit.</p>
      </CardContent>
    </Card>
  );
}
