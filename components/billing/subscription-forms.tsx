"use client";

import { useActionState } from "react";
import {
  cancelSubscriptionAction,
  changePlanAction,
  overrideSubscriptionAction,
  saveBillingProfileAction,
  savePlatformBillingAction,
  startCheckoutAction,
  startSubscriptionAction,
  voidInvoiceAction,
} from "@/actions/billing";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult, BillingProfile, PlatformBillingSettings, SubscriptionPlan } from "@/types";

const initial: ActionResult = { success: false };

export function StartSubscriptionForm({ plans }: { plans: SubscriptionPlan[] }) {
  const [state, action, pending] = useActionState(startSubscriptionAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="planId">Plan</Label>
            <Select id="planId" name="planId" required>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {formatCurrency(plan.monthly_price, plan.currency)} / month
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="billingCycle">Billing cycle</Label>
            <Select id="billingCycle" name="billingCycle" defaultValue="MONTHLY">
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="startTrial" defaultChecked />
            Start trial when the plan allows it
          </label>
          {state.message ? <Alert variant={state.success ? "success" : "error"} className="md:col-span-2">{state.message}</Alert> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Starting..." : "Start subscription"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChangePlanForm({ plans, currentPlanId }: { plans: SubscriptionPlan[]; currentPlanId?: string }) {
  const [state, action, pending] = useActionState(changePlanAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="planId">Plan</Label>
            <Select id="planId" name="planId" defaultValue={currentPlanId}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="billingCycle">Cycle</Label>
            <Select id="billingCycle" name="billingCycle" defaultValue="MONTHLY">
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" />
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"} className="md:col-span-2">{state.message}</Alert> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Change plan"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CancelSubscriptionForm() {
  const [state, action, pending] = useActionState(cancelSubscriptionAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancel</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="atPeriodEnd" defaultChecked />
            Cancel at period end
          </label>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" />
          </div>
          <p className="text-xs text-slate-500">Cancellation preserves tenant data. It does not delete payroll or employees.</p>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" variant="outline" disabled={pending}>{pending ? "Cancelling..." : "Cancel subscription"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function OverrideSubscriptionForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(overrideSubscriptionAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform override</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="organizationId" value={organizationId} />
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="ACTIVE">
              {["TRIAL", "ACTIVE", "PAST_DUE", "GRACE_PERIOD", "SUSPENDED", "CANCELLED", "EXPIRED"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" required />
            <FieldError>{state.errors?.reason?.[0]}</FieldError>
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Override"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function BillingProfileForm({ profile, canEdit }: { profile: BillingProfile | null; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveBillingProfileAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" name="legalName" defaultValue={profile?.legal_name ?? ""} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="billingEmail">Billing email</Label>
            <Input id="billingEmail" name="billingEmail" type="email" defaultValue={profile?.billing_email ?? ""} disabled={!canEdit} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="addressLine1">Address</Label>
            <Input id="addressLine1" name="addressLine1" defaultValue={profile?.address_line1 ?? ""} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={profile?.city ?? ""} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={profile?.state ?? ""} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" name="pin" defaultValue={profile?.pin ?? ""} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" name="gstin" defaultValue={profile?.gstin ?? ""} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" name="pan" defaultValue={profile?.pan ?? ""} disabled={!canEdit} />
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"} className="md:col-span-2">{state.message}</Alert> : null}
          {canEdit ? (
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save billing details"}</Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function PlatformBillingForm({ settings }: { settings: PlatformBillingSettings }) {
  const [state, action, pending] = useActionState(savePlatformBillingAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform seller details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" name="legalName" defaultValue={settings.legal_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="billingEmail">Billing email</Label>
            <Input id="billingEmail" name="billingEmail" type="email" defaultValue={settings.billing_email ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="addressLine1">Address</Label>
            <Input id="addressLine1" name="addressLine1" defaultValue={settings.address_line1 ?? ""} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={settings.city ?? ""} />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={settings.state ?? ""} />
          </div>
          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" name="pin" defaultValue={settings.pin ?? ""} />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" name="gstin" defaultValue={settings.gstin ?? ""} />
          </div>
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" name="pan" defaultValue={settings.pan ?? ""} />
          </div>
          <div>
            <Label htmlFor="taxLabel">Tax label</Label>
            <Input id="taxLabel" name="taxLabel" defaultValue={settings.tax_label ?? ""} placeholder="GST" />
          </div>
          <div>
            <Label htmlFor="taxRate">Tax rate %</Label>
            <Input id="taxRate" name="taxRate" type="number" min="0" step="0.01" defaultValue={settings.tax_rate ?? ""} />
          </div>
          <div>
            <Label htmlFor="invoicePrefix">Invoice prefix</Label>
            <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.invoice_prefix} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="taxConfigured" defaultChecked={settings.tax_configured} />
            Tax configuration is complete
          </label>
          <p className="md:col-span-2 text-xs text-slate-500">GST is not assumed. Incomplete tax config is flagged on invoices.</p>
          {state.message ? <Alert variant={state.success ? "success" : "error"} className="md:col-span-2">{state.message}</Alert> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save platform billing"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CheckoutButton({ invoiceId, payable }: { invoiceId: string; payable: boolean }) {
  async function submit() {
    await startCheckoutAction(invoiceId);
  }
  return (
    <form action={submit}>
      <Button type="submit" disabled={!payable} variant="outline" size="sm">
        Pay
      </Button>
    </form>
  );
}

export function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  async function submit() {
    await voidInvoiceAction(invoiceId);
  }
  return (
    <form action={submit}>
      <Button type="submit" variant="outline" size="sm">Void</Button>
    </form>
  );
}
