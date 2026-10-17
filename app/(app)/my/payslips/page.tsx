import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfPayslips } from "@/lib/ess/query";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My payslips" };

export default async function MyPayslipsPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const rows = await loadSelfPayslips(user.organization.id, identity.employee.id);

  return (
    <div>
      <PageHeader
        title="My payslips"
        description="Issued payslips for your employee record. Downloads use the existing payslip PDF endpoint; no public URLs are exposed."
      />

      <Card>
        <CardHeader>
          <CardTitle>Payslip history</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No payslips issued yet.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.payslip.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">{row.payslip.payslip_number ?? row.run.period}</p>
                    <p className="text-xs text-slate-500">
                      {row.run.period}
                      {row.payslip.issued_at ? ` · issued ${formatDateOnly(row.payslip.issued_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(row.item.net_pay)}</span>
                    <EssStatusBadge status={row.payslip.status} />
                    {row.payslip.status !== "VOID" ? (
                      <a href={`/api/payroll/payslips/${row.payslip.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          Download
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
