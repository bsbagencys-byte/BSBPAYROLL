"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveClaimTypeAction } from "@/actions/claims";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CLAIM_CATEGORIES,
  CLAIM_CATEGORY_LABELS,
  CLAIM_WORKFLOW_MODES,
  CLAIM_WORKFLOW_MODE_LABELS,
} from "@/lib/constants";
import type { ActionResult, ClaimType } from "@/types";

const initial: ActionResult = { success: false };

export function ClaimTypeForm({ row }: { row?: ClaimType }) {
  const [state, action, pending] = useActionState(saveClaimTypeAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add claim type"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={row?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" className="mt-1" defaultValue={row?.code} required />
            <FieldError>{state.errors?.code?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" className="mt-1" defaultValue={row?.category ?? "TRAVEL"}>
              {CLAIM_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CLAIM_CATEGORY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="workflowMode">Workflow</Label>
            <Select id="workflowMode" name="workflowMode" className="mt-1" defaultValue={row?.workflow_mode ?? "TWO_STEP"}>
              {CLAIM_WORKFLOW_MODES.map((item) => (
                <option key={item} value={item}>
                  {CLAIM_WORKFLOW_MODE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="maxAmount">Maximum amount</Label>
            <Input id="maxAmount" name="maxAmount" className="mt-1" defaultValue={row?.max_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </Select>
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="requiresReceipt" defaultChecked={row?.requires_receipt ?? true} className="h-4 w-4 rounded border-slate-300" />
              Requires receipt
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="requiresTravelFields" defaultChecked={row?.requires_travel_fields ?? false} className="h-4 w-4 rounded border-slate-300" />
              Requires travel fields
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="includeInPayrollDefault" defaultChecked={row?.include_in_payroll_default ?? true} className="h-4 w-4 rounded border-slate-300" />
              Include in payroll by default
            </label>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save claim type" : "Create claim type"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
