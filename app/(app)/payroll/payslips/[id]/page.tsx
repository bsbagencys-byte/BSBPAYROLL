import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayslipDocument } from "@/components/payroll/payslip-view";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPayslipView } from "@/lib/payroll/query";
import { loadOrgCatalog } from "@/lib/org-data";
import { generatePayslipsAction } from "@/actions/payroll";

export const metadata = { title: "Payslip" };

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("payroll.payslip.view");
  const { id } = await params;
  const view = await loadPayslipView(user.organization.id, id);
  if (!view) notFound();
  if (!hasPermission(user, "payroll.view")) {
    const catalog = await loadOrgCatalog(user.organization.id);
    const own = catalog.employees.find((item) => item.user_id === user.id);
    if (!own || own.id !== view.payslip.employee_id) notFound();
  }
  const canGenerate = hasPermission(user, "payslip.generate");
  const canExport = hasPermission(user, "payslip.export") || hasPermission(user, "payroll.payslip.view");

  return (
    <div>
      <PageHeader
        title={`Payslip · ${view.employeeName}`}
        description={view.payslip.payslip_number ? `${view.payslip.payslip_number} · ${view.run.period}` : view.run.period}
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <a href={`/api/payroll/payslips/${view.payslip.id}/pdf`}>
                <Button variant="outline">Download PDF</Button>
              </a>
            ) : null}
            {canGenerate ? (
              <form action={generatePayslipsAction}>
                <input type="hidden" name="runId" value={view.run.id} />
                <Button type="submit" variant="outline">
                  Regenerate
                </Button>
              </form>
            ) : null}
            <Link href="/payroll/payslips">
              <Button variant="outline">All payslips</Button>
            </Link>
          </div>
        }
      />
      <PayrollSubnav />
      <PayslipDocument view={view} />
    </div>
  );
}
