import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanApplicationTable } from "@/components/loans/application-table";
import { LoanAccountTable } from "@/components/loans/account-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLoansOverview } from "@/lib/loans/query";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Loans" };

export default async function LoansPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const overview = await loadLoansOverview(user.organization.id, user.organization.timezone);
  const canCreate = hasPermission(user, "loans.create");

  return (
    <div>
      <PageHeader
        title="Loans & advances"
        description="Loan types, applications, disbursement, EMI schedules and repayments. Payroll deduction is a later-phase contract via getEmployeeLoanDeductions."
        actions={
          canCreate ? (
            <Link href="/loans/applications/new">
              <Button>New application</Button>
            </Link>
          ) : null
        }
      />
      <LoansSubnav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Active loans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.active.length}</p>
            <p className="text-xs text-slate-500">{formatCurrency(overview.outstanding)} outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Awaiting approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.pending.length}</p>
            <p className="text-xs text-slate-500">Submitted or in workflow</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">EMI this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(overview.monthlyEmi)}</p>
            <p className="text-xs text-slate-500">{overview.overdue.length} overdue installments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Advances</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.advances.length}</p>
            <p className="text-xs text-slate-500">{overview.types.filter((item) => item.status === "ACTIVE").length} loan types</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Recent applications</h2>
          <Link href="/loans/applications" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {overview.recentApplications.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet.</p>
        ) : (
          <LoanApplicationTable items={overview.recentApplications} />
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Active accounts</h2>
          <Link href="/loans/active" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {overview.recentAccounts.length === 0 ? (
          <p className="text-sm text-slate-500">No loan accounts yet.</p>
        ) : (
          <LoanAccountTable items={overview.recentAccounts} />
        )}
      </div>
    </div>
  );
}
