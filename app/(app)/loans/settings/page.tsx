import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanPolicyForm } from "@/components/loans/loan-policy-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLoansCatalog } from "@/lib/loans/query";
import { toggleLoanPolicyAction } from "@/actions/loans";
import { formatCurrency, lookupName } from "@/lib/utils";

export const metadata = { title: "Loan settings" };

export default async function LoanSettingsPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const catalog = await loadLoansCatalog(user.organization.id);
  const canManage = hasPermission(user, "loans.settings");

  return (
    <div>
      <PageHeader title="Settings" description="Eligibility policies, CSV exports and payroll deduction contract. Types live under Loan types." />
      <LoansSubnav />

      {canManage ? (
        <div className="mb-6">
          <LoanPolicyForm
            types={catalog.types}
            branches={catalog.branches}
            departments={catalog.departments}
            designations={catalog.designations}
            employmentTypes={catalog.employmentTypes}
            employees={catalog.employees}
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent>
            {catalog.policies.length === 0 ? (
              <EmptyState title="No policies" description="Add eligibility limits per loan type and scope." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Limits</th>
                      <th className="py-2 pr-4">Status</th>
                      {canManage ? <th className="py-2" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.policies.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.effective_from} → {item.effective_to ?? "open"}
                          </p>
                        </td>
                        <td className="py-2 pr-4">{lookupName(catalog.types, item.loan_type_id) ?? "—"}</td>
                        <td className="py-2 pr-4 text-xs text-slate-600">
                          {item.max_amount != null ? `Max ${formatCurrency(item.max_amount)}` : "No cap"}
                          {item.max_tenure_months != null ? ` · ${item.max_tenure_months} mo` : ""}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                        </td>
                        {canManage ? (
                          <td className="py-2 text-right">
                            <form action={toggleLoanPolicyAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="status" value={item.status} />
                              <Button type="submit" size="sm" variant="outline">
                                {item.status === "ACTIVE" ? "Disable" : "Enable"}
                              </Button>
                            </form>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ReportLink href="/api/loans/reports/register" title="Loan register" description="Every application with amount, EMI and status." />
            <ReportLink href="/api/loans/reports/active" title="Active loans" description="Disbursed accounts still recovering." />
            <ReportLink href="/api/loans/reports/outstanding" title="Outstanding" description="Principal and interest still due." />
            <ReportLink href="/api/loans/reports/schedule" title="EMI schedule" description="Installments across all accounts." />
            <ReportLink href="/api/loans/reports/repayments" title="Repayments" description="Manual and payroll recoveries." />
            <ReportLink href="/api/loans/reports/advances" title="Salary advances" description="Advance accounts only." />
            <ReportLink href="/api/loans/reports/overdue" title="Overdue" description="Installments past due date." />
            <ReportLink href="/api/loans/reports/statement" title="Employee statement" description="Outstanding and EMI per employee." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll contract</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="font-medium text-slate-900">getEmployeeLoanDeductions(orgId, employeeId, payrollPeriod)</p>
            <p className="mt-2">
              Returns EMI due, advance recovery and outstanding for ACTIVE auto-deduct accounts. This module does not write payroll tables or mark installments as payroll-paid.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organisation defaults</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p>
              Currency {user.organization.currency}. Payroll frequency {user.organization.payroll_frequency}. Change these under Settings / Company.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
      <a href={href} className="text-sm font-medium text-brand-700 hover:underline">
        Download CSV
      </a>
    </div>
  );
}
