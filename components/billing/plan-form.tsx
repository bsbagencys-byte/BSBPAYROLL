"use client";

import { useActionState } from "react";
import { savePlanAction } from "@/actions/billing";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, SubscriptionPlan } from "@/types";

const initial: ActionResult<{ id: string }> = { success: false };

export function PlanForm({ plan }: { plan?: SubscriptionPlan }) {
  const [state, action, pending] = useActionState(savePlanAction, initial);
  const extra = (() => {
    try {
      return JSON.parse(plan?.entitlements_json || "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  })();
  let modules = "";
  try {
    modules = (JSON.parse(plan?.modules_json || "[]") as string[]).join(", ");
  } catch {
    modules = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan ? "Edit plan" : "Create plan"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" defaultValue={plan?.code ?? ""} required />
            <FieldError>{state.errors?.code?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={plan?.name ?? ""} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={plan?.description ?? ""} />
          </div>
          <div>
            <Label htmlFor="monthlyPrice">Monthly price</Label>
            <Input id="monthlyPrice" name="monthlyPrice" type="number" min="0" step="0.01" defaultValue={plan?.monthly_price ?? 0} />
          </div>
          <div>
            <Label htmlFor="annualPrice">Annual price</Label>
            <Input id="annualPrice" name="annualPrice" type="number" min="0" step="0.01" defaultValue={plan?.annual_price ?? 0} />
          </div>
          <div>
            <Label htmlFor="trialDays">Trial days</Label>
            <Input id="trialDays" name="trialDays" type="number" min="0" defaultValue={plan?.trial_days ?? 0} />
          </div>
          <div>
            <Label htmlFor="billingCycleDefault">Default cycle</Label>
            <select id="billingCycleDefault" name="billingCycleDefault" defaultValue={plan?.billing_cycle_default ?? "MONTHLY"} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
          <div>
            <Label htmlFor="employeeLimit">Employee limit (blank = unlimited)</Label>
            <Input id="employeeLimit" name="employeeLimit" type="number" min="0" defaultValue={plan?.employee_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="branchLimit">Branch limit</Label>
            <Input id="branchLimit" name="branchLimit" type="number" min="0" defaultValue={plan?.branch_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="biometricDeviceLimit">Biometric device limit</Label>
            <Input id="biometricDeviceLimit" name="biometricDeviceLimit" type="number" min="0" defaultValue={plan?.biometric_device_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={plan?.status ?? "DRAFT"} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="modules">Enabled modules (comma separated)</Label>
            <Input id="modules" name="modules" defaultValue={modules} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="apiAccess" defaultChecked={extra.apiAccess !== false} />
            API access
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="advancedAnalytics" defaultChecked={extra.advancedAnalytics === true} />
            Advanced analytics
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="reportsExport" defaultChecked={extra.reportsExport !== false} />
            Report export
          </label>
          <div>
            <Label htmlFor="reason">Change reason</Label>
            <Input id="reason" name="reason" placeholder="Required when prices change" />
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"} className="md:col-span-2">{state.message}</Alert> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save plan"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
