"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { completeSetupAction, saveSetupStep1, saveSetupStep2, saveSetupStep3 } from "@/actions/setup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, FieldError } from "@/components/ui/alert";
import { INDUSTRIES, PAYROLL_FREQUENCIES, TIMEZONES, WEEKDAYS } from "@/lib/constants";
import type { ActionResult, Organization, Branch, Department, Designation } from "@/types";

const initial: ActionResult = { success: false };

export function SetupWizard({
  organization,
  branch,
  department,
  designation,
}: {
  organization: Organization;
  branch: Branch | null;
  department: Department | null;
  designation: Designation | null;
}) {
  const [step, setStep] = useState(Math.min(organization.setup_step || 1, 4));
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2 text-sm">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`flex-1 rounded-full py-2 text-center ${
              step === n ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Step {n}
          </button>
        ))}
      </div>
      {step === 1 ? (
        <Step1 organization={organization} onSuccess={() => setStep(2)} />
      ) : null}
      {step === 2 ? (
        <Step2
          branch={branch}
          department={department}
          designation={designation}
          onSuccess={() => setStep(3)}
        />
      ) : null}
      {step === 3 ? <Step3 organization={organization} onSuccess={() => setStep(4)} /> : null}
      {step === 4 ? (
        <CompleteCard
          onComplete={async () => {
            const result = await completeSetupAction();
            if (result.success) router.push("/dashboard");
          }}
        />
      ) : null}
    </div>
  );
}

function Step1({ organization, onSuccess }: { organization: Organization; onSuccess: () => void }) {
  const [state, action, pending] = useActionState(async (prev: ActionResult | undefined, formData: FormData) => {
    const result = await saveSetupStep1(prev, formData);
    if (result.success) onSuccess();
    return result;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
        <CardDescription>Legal identity used across payroll and compliance later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          {state?.message && !state.success ? <Alert className="sm:col-span-2">{state.message}</Alert> : null}
          <Field label="Company name" name="name" defaultValue={organization.name} error={state?.errors?.name?.[0]} />
          <Field label="Legal name" name="legalName" defaultValue={organization.legal_name ?? ""} error={state?.errors?.legalName?.[0]} />
          <Field label="Display name" name="displayName" defaultValue={organization.display_name ?? ""} error={state?.errors?.displayName?.[0]} />
          <Field label="Phone" name="phone" defaultValue={organization.phone ?? ""} error={state?.errors?.phone?.[0]} />
          <Field label="Email" name="email" defaultValue={organization.email ?? ""} error={state?.errors?.email?.[0]} />
          <Field label="Address" name="addressLine1" defaultValue={organization.address_line1 ?? ""} error={state?.errors?.addressLine1?.[0]} className="sm:col-span-2" />
          <Field label="Address line 2" name="addressLine2" defaultValue={organization.address_line2 ?? ""} />
          <Field label="City" name="city" defaultValue={organization.city ?? ""} error={state?.errors?.city?.[0]} />
          <Field label="State" name="state" defaultValue={organization.state ?? ""} error={state?.errors?.state?.[0]} />
          <Field label="PIN" name="pin" defaultValue={organization.pin ?? ""} error={state?.errors?.pin?.[0]} />
          <Field label="PAN" name="pan" defaultValue={organization.pan ?? ""} error={state?.errors?.pan?.[0]} />
          <Field label="TAN" name="tan" defaultValue={organization.tan ?? ""} error={state?.errors?.tan?.[0]} />
          <Field label="GSTIN" name="gstin" defaultValue={organization.gstin ?? ""} error={state?.errors?.gstin?.[0]} />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save and continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Step2({
  branch,
  department,
  designation,
  onSuccess,
}: {
  branch: Branch | null;
  department: Department | null;
  designation: Designation | null;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ActionResult | undefined, formData: FormData) => {
    const result = await saveSetupStep2(prev, formData);
    if (result.success) onSuccess();
    return result;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default structure</CardTitle>
        <CardDescription>Create the first branch, department and designation.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.message && !state.success ? <Alert>{state.message}</Alert> : null}
          <Field label="Default branch" name="branchName" defaultValue={branch?.name ?? "Head Office"} error={state?.errors?.branchName?.[0]} />
          <Field label="Default department" name="departmentName" defaultValue={department?.name ?? "Operations"} error={state?.errors?.departmentName?.[0]} />
          <Field label="Default designation" name="designationName" defaultValue={designation?.name ?? "Staff"} error={state?.errors?.designationName?.[0]} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save and continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Step3({ organization, onSuccess }: { organization: Organization; onSuccess: () => void }) {
  const [state, action, pending] = useActionState(async (prev: ActionResult | undefined, formData: FormData) => {
    const result = await saveSetupStep3(prev, formData);
    if (result.success) onSuccess();
    return result;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business defaults</CardTitle>
        <CardDescription>Timezone and currency control how dates and amounts are displayed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          {state?.message && !state.success ? <Alert className="sm:col-span-2">{state.message}</Alert> : null}
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" name="industry" className="mt-1" defaultValue={organization.industry ?? "Information Technology"}>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
            <FieldError>{state?.errors?.industry?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="payrollFrequency">Payroll frequency</Label>
            <Select id="payrollFrequency" name="payrollFrequency" className="mt-1" defaultValue={organization.payroll_frequency}>
              {PAYROLL_FREQUENCIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="weeklyOff">Weekly off</Label>
            <Select id="weeklyOff" name="weeklyOff" className="mt-1" defaultValue={organization.weekly_off}>
              {WEEKDAYS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select id="timezone" name="timezone" className="mt-1" defaultValue={organization.timezone}>
              {TIMEZONES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" name="currency" className="mt-1" defaultValue={organization.currency}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED</option>
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save and continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CompleteCard({ onComplete }: { onComplete: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete setup</CardTitle>
        <CardDescription>You can change these values later from Settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Phase 1 will unlock the dashboard, user management, roles and company settings. Payroll modules remain disabled until later phases.
        </p>
        <Button
          onClick={async () => {
            setPending(true);
            await onComplete();
            setPending(false);
          }}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Finish and go to dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} className="mt-1" />
      <FieldError>{error}</FieldError>
    </div>
  );
}
