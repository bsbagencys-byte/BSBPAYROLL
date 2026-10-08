import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { TaxDeclarationForm, TaxDeclarationItemForm } from "@/components/compliance/declaration-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { listTaxDeclarationItems, listTaxDeclarations } from "@/lib/statutory/repository";
import { reviewTaxDeclarationFormAction, submitTaxDeclarationAction } from "@/actions/statutory";
import { TAX_DECLARATION_STATUS_LABELS, TAX_REGIME_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Tax declarations" };

export default async function ComplianceDeclarationsPage() {
  const user = await requirePermissionOrRedirect("compliance.view");
  const [catalog, declarations, items] = await Promise.all([
    loadOrgCatalog(user.organization.id),
    listTaxDeclarations(user.organization.id),
    listTaxDeclarationItems(user.organization.id),
  ]);
  const canManage = hasPermission(user, "compliance.tax.manage");

  return (
    <div>
      <PageHeader title="Declarations" description="Employee tax declarations by financial year and regime. Approved old-regime items reduce taxable income." />
      <ComplianceSubnav />
      {canManage ? (
        <div className="mb-6">
          <TaxDeclarationForm employees={catalog.employees} />
        </div>
      ) : null}
      {declarations.length === 0 ? (
        <EmptyState title="No declarations" description="Create a draft declaration for an employee and tax year." />
      ) : (
        <div className="space-y-4">
          {declarations.map((item) => {
            const employee = catalog.employees.find((row) => row.id === item.employee_id);
            const rows = items.filter((row) => row.declaration_id === item.id);
            return (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {employee?.display_name ?? "Employee"} · {item.tax_year}
                    <Badge variant="muted">{TAX_DECLARATION_STATUS_LABELS[item.status]}</Badge>
                    <span className="text-sm font-normal text-slate-500">{TAX_REGIME_LABELS[item.regime]}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">No items.</p>
                  ) : (
                    <table className="min-w-full text-left text-sm">
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{row.section_code}</td>
                            <td className="py-2 pr-3">{row.name}</td>
                            <td className="py-2 text-right">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {canManage && item.status === "DRAFT" ? <TaxDeclarationItemForm declarationId={item.id} /> : null}
                  {canManage && item.status === "DRAFT" ? (
                    <form action={submitTaxDeclarationAction}>
                      <input type="hidden" name="declarationId" value={item.id} />
                      <Button type="submit" size="sm">
                        Submit
                      </Button>
                    </form>
                  ) : null}
                  {canManage && item.status === "SUBMITTED" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={reviewTaxDeclarationFormAction}>
                        <input type="hidden" name="declarationId" value={item.id} />
                        <input type="hidden" name="decision" value="APPROVED" />
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                      <form action={reviewTaxDeclarationFormAction}>
                        <input type="hidden" name="declarationId" value={item.id} />
                        <input type="hidden" name="decision" value="REJECTED" />
                        <Button type="submit" size="sm" variant="outline">
                          Reject
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
