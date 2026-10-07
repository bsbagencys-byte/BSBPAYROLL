import { PageHeader } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Payroll reports" };

export default async function PayrollReportsPage() {
  await requirePermissionOrRedirect("payroll.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for register, employee, earnings, deductions, approval and payslips." />
      <PayrollSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/payroll/reports/register" title="Payroll register" description="All runs with totals, errors and status." />
        <ReportCard href="/api/payroll/reports/sheet" title="Payroll sheet" description="Latest run employee lines." />
        <ReportCard href="/api/payroll/reports/employee" title="Employee payroll" description="Latest run employee review export." />
        <ReportCard href="/api/payroll/reports/earnings" title="Earnings" description="Earning, reimbursement and claim lines." />
        <ReportCard href="/api/payroll/reports/deductions" title="Deductions" description="Deduction, loan and adjustment lines." />
        <ReportCard href="/api/payroll/reports/approval" title="Approval report" description="Workflow history for the latest run." />
        <ReportCard href="/api/payroll/reports/bank" title="Bank file" description="Included employees and net pay." />
        <ReportCard href="/api/payroll/reports/payslips" title="Payslips" description="Numbered payslip register." />
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
