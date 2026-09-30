import { PageHeader } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Salary reports" };

export default async function SalaryReportsPage() {
  await requirePermissionOrRedirect("salary.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for structures, compensation, revisions, CTC and employees without salary." />
      <SalarySubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/salary/reports/structures" title="Salary structures" description="Template name, code, CTC and status." />
        <ReportCard href="/api/salary/reports/compensation" title="Employee compensation" description="Current structure, CTC, gross and earnings split." />
        <ReportCard href="/api/salary/reports/revisions" title="Salary revisions" description="Previous and new CTC, reason and status." />
        <ReportCard href="/api/salary/reports/ctc" title="CTC report" description="All assignments including closed periods." />
        <ReportCard href="/api/salary/reports/without" title="Employees without salary" description="Employees who have no active assignment." />
        <ReportCard href="/api/salary/reports/variable" title="Variable earnings" description="Variable earnings and reimbursement entries." />
      </div>
    </div>
  );
}

function ReportCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{description}</p>
        <a href={href} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
          Download CSV
        </a>
      </CardContent>
    </Card>
  );
}
