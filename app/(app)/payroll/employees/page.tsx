import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { PayrollItemTable } from "@/components/payroll/item-table";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadPayrollOverview, toPayrollItemList } from "@/lib/payroll/query";
import { loadOrgCatalog } from "@/lib/org-data";
import { listEmployment } from "@/lib/leave/repository";
import { periodLabel } from "@/lib/payroll/engine";

export const metadata = { title: "Payroll employees" };

export default async function PayrollEmployeesPage() {
  const user = await requirePermissionOrRedirect("payroll.view");
  const overview = await loadPayrollOverview(user.organization.id, user.organization.timezone);
  const canProcess = hasPermission(user, "payroll.process");
  const [catalog, employment] = await Promise.all([
    loadOrgCatalog(user.organization.id),
    listEmployment(user.organization.id),
  ]);
  const items = overview.latest
    ? toPayrollItemList({
        items: overview.items,
        employees: catalog.employees,
        departments: catalog.departments,
        branches: catalog.branches,
        employment,
      })
    : [];
  const locked = overview.latest
    ? overview.latest.status === "FINALIZED" ||
      overview.latest.status === "LOCKED" ||
      overview.latest.status === "PROCESSED" ||
      overview.latest.status === "PAID" ||
      overview.latest.status === "CANCELLED" ||
      overview.latest.status === "APPROVED" ||
      overview.latest.status === "APPROVAL_PENDING"
    : true;

  return (
    <div>
      <PageHeader
        title="Employees"
        description={overview.latest ? `Latest run ${periodLabel(overview.latest.period)}` : "Create a payroll run to see employee lines."}
      />
      <PayrollSubnav />
      {items.length === 0 ? (
        <EmptyState title="No payroll items" description="Calculate a run to include active employees with salary." />
      ) : (
        <PayrollItemTable items={items} canProcess={canProcess} locked={locked} />
      )}
    </div>
  );
}
