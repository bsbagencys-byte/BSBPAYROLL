import { PageHeader } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Salary settings" };

export default async function SalarySettingsPage() {
  const user = await requirePermissionOrRedirect("salary.structure.manage");
  return (
    <div>
      <PageHeader title="Salary settings" description="Compensation engine defaults. Payroll run, PF/ESI/TDS and payslips stay in later phases." />
      <SalarySubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">{user.organization.currency}</p>
            <p className="mt-2">CTC and component amounts are stored in this currency. Change it under Settings / Company.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payroll frequency</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">{user.organization.payroll_frequency}</p>
            <p className="mt-2">Used later by the payroll engine. This phase only stores monthly CTC breakdowns.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Effective dates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            getEmployeeSalaryForDate returns the assignment covering a date. Overlapping ACTIVE periods are blocked. A revision closes the previous period the day before the new effective date.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance / leave inputs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Working days, present days, LOP and paid leave are read from attendance_days and leave requests. Salary never writes attendance or leave. Proration is not finalized here.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
