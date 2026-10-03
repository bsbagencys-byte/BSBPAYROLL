import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanTypeForm } from "@/components/loans/loan-type-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadLoansCatalog } from "@/lib/loans/query";
import { toggleLoanTypeAction } from "@/actions/loans";
import { LOAN_CATEGORY_LABELS, LOAN_INTEREST_METHOD_LABELS, LOAN_WORKFLOW_MODE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Loan types" };

export default async function LoanTypesPage() {
  const user = await requirePermissionOrRedirect("loans.view");
  const catalog = await loadLoansCatalog(user.organization.id);
  const canManage = hasPermission(user, "loans.settings");

  return (
    <div>
      <PageHeader title="Loan types" description="Salary advance, employee loan and festival advance templates. Interest and EMI are calculated in the engine, not the UI." />
      <LoansSubnav />
      {canManage ? (
        <div className="mb-6">
          <LoanTypeForm />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Configured types</CardTitle>
        </CardHeader>
        <CardContent>
          {catalog.types.length === 0 ? (
            <EmptyState title="No loan types" description="Add a type before employees can apply." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Interest</th>
                    <th className="py-2 pr-4">Limits</th>
                    <th className="py-2 pr-4">Workflow</th>
                    <th className="py-2 pr-4">Status</th>
                    {canManage ? <th className="py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {catalog.types.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.code}</p>
                      </td>
                      <td className="py-2 pr-4">{LOAN_CATEGORY_LABELS[item.category]}</td>
                      <td className="py-2 pr-4">
                        {LOAN_INTEREST_METHOD_LABELS[item.interest_method]}
                        {item.interest_rate != null ? ` · ${item.interest_rate}%` : ""}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-600">
                        {item.max_amount != null ? formatCurrency(item.max_amount) : "No cap"}
                        {item.max_tenure_months != null ? ` · ${item.max_tenure_months} mo` : ""}
                      </td>
                      <td className="py-2 pr-4">{LOAN_WORKFLOW_MODE_LABELS[item.workflow_mode]}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                      </td>
                      {canManage ? (
                        <td className="py-2 text-right">
                          <form action={toggleLoanTypeAction}>
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
    </div>
  );
}
