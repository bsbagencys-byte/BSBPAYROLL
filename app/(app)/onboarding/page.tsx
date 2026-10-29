import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { OnboardingStepBadge } from "@/components/onboarding/status-badge";
import { RefreshOnboardingButton, SkipAttendanceForm } from "@/components/onboarding/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { ONBOARDING_STEP_STATUS_LABELS } from "@/lib/constants";
import { refreshOnboarding } from "@/lib/onboarding/service";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requirePermissionOrRedirect("onboarding.view");
  const data = await refreshOnboarding(user.organization.id, user.id);
  const canManage = hasPermission(user, "onboarding.manage");
  const complete = data.progress.status === "COMPLETE";

  return (
    <div>
      <PageHeader
        title="Customer onboarding"
        description="Checklist is complete only when required steps have stored data. Opening a page does not mark a step complete."
        actions={<RefreshOnboardingButton />}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{complete ? "Complete" : data.progress.status === "IN_PROGRESS" ? "In progress" : "Not started"}</p>
            <p className="text-xs text-slate-500">Current step: {data.progress.current_step}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Employees</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{data.facts.employeeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Attendance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{data.facts.skippedAttendance ? "Skipped (optional)" : "Blocked until Phase 4"}</p>
          </CardContent>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Step</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.steps.map((step) => (
              <tr key={step.step_key} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.required ? "Required" : "Optional"}</p>
                </td>
                <td className="px-4 py-3"><OnboardingStepBadge status={step.status} /></td>
                <td className="px-4 py-3 text-slate-600">
                  {step.evidence.join(" · ")}
                  {step.skipped_reason ? <p className="text-xs text-amber-700">{step.skipped_reason}</p> : null}
                </td>
                <td className="px-4 py-3">
                  {step.blocked ? (
                    <span className="text-xs text-slate-500">{ONBOARDING_STEP_STATUS_LABELS[step.status]}</span>
                  ) : (
                    <Link href={step.href} className="text-brand-700 hover:underline">Open</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManage ? <div className="mt-6"><SkipAttendanceForm /></div> : null}
      <p className="mt-4 text-xs text-slate-500">
        Existing company setup at /setup is unchanged. This checklist reads stored organization, employee, salary, leave and user data.
      </p>
    </div>
  );
}
