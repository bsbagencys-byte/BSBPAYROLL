"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveCompanySettings } from "@/actions/setup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, FieldError } from "@/components/ui/alert";
import { INDUSTRIES, PAYROLL_FREQUENCIES, TIMEZONES, WEEKDAYS } from "@/lib/constants";
import type { ActionResult, Organization } from "@/types";

const initial: ActionResult = { success: false };

export function CompanySettingsForm({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(saveCompanySettings, initial);

  return (
    <form action={action} className="space-y-4">
      {state?.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" name="name" defaultValue={organization.name} error={state?.errors?.name?.[0]} disabled={!canEdit} />
          <Field label="Legal name" name="legalName" defaultValue={organization.legal_name ?? ""} error={state?.errors?.legalName?.[0]} disabled={!canEdit} />
          <Field label="Display name" name="displayName" defaultValue={organization.display_name ?? ""} error={state?.errors?.displayName?.[0]} disabled={!canEdit} />
          <Field label="Phone" name="phone" defaultValue={organization.phone ?? ""} error={state?.errors?.phone?.[0]} disabled={!canEdit} />
          <Field label="Email" name="email" defaultValue={organization.email ?? ""} error={state?.errors?.email?.[0]} disabled={!canEdit} />
          <Field label="Address" name="addressLine1" defaultValue={organization.address_line1 ?? ""} className="sm:col-span-2" disabled={!canEdit} />
          <Field label="Address line 2" name="addressLine2" defaultValue={organization.address_line2 ?? ""} disabled={!canEdit} />
          <Field label="City" name="city" defaultValue={organization.city ?? ""} error={state?.errors?.city?.[0]} disabled={!canEdit} />
          <Field label="State" name="state" defaultValue={organization.state ?? ""} error={state?.errors?.state?.[0]} disabled={!canEdit} />
          <Field label="PIN" name="pin" defaultValue={organization.pin ?? ""} error={state?.errors?.pin?.[0]} disabled={!canEdit} />
          <Field label="PAN" name="pan" defaultValue={organization.pan ?? ""} error={state?.errors?.pan?.[0]} disabled={!canEdit} />
          <Field label="TAN" name="tan" defaultValue={organization.tan ?? ""} disabled={!canEdit} />
          <Field label="GSTIN" name="gstin" defaultValue={organization.gstin ?? ""} error={state?.errors?.gstin?.[0]} disabled={!canEdit} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Business defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" name="industry" className="mt-1" defaultValue={organization.industry ?? "Other"} disabled={!canEdit}>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="payrollFrequency">Payroll frequency</Label>
            <Select id="payrollFrequency" name="payrollFrequency" className="mt-1" defaultValue={organization.payroll_frequency} disabled={!canEdit}>
              {PAYROLL_FREQUENCIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="weeklyOff">Weekly off</Label>
            <Select id="weeklyOff" name="weeklyOff" className="mt-1" defaultValue={organization.weekly_off} disabled={!canEdit}>
              {WEEKDAYS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select id="timezone" name="timezone" className="mt-1" defaultValue={organization.timezone} disabled={!canEdit}>
              {TIMEZONES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" name="currency" className="mt-1" defaultValue={organization.currency} disabled={!canEdit}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED</option>
            </Select>
          </div>
        </CardContent>
      </Card>
      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
      ) : (
        <p className="text-sm text-slate-500">You have view-only access to company settings.</p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  className,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} className="mt-1" disabled={disabled} />
      <FieldError>{error}</FieldError>
    </div>
  );
}
