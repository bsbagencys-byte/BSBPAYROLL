import { PageHeader } from "@/components/layout/app-shell";
import { LoansSubnav } from "@/components/loans/subnav";
import { LoanApplicationForm } from "@/components/loans/application-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadLoansCatalog } from "@/lib/loans/query";

export const metadata = { title: "New loan application" };

export default async function NewLoanApplicationPage() {
  const user = await requirePermissionOrRedirect("loans.create");
  const catalog = await loadLoansCatalog(user.organization.id);
  const self = catalog.employees.find((item) => item.user_id === user.id) ?? null;
  const isEmployee = user.roleCode === "EMPLOYEE";

  return (
    <div>
      <PageHeader title="New application" description="Request a salary advance or employee loan. EMI is quoted before submit." />
      <LoansSubnav />
      <LoanApplicationForm
        types={catalog.types.filter((item) => item.status === "ACTIVE")}
        employees={catalog.employees}
        lockedEmployeeId={isEmployee ? self?.id ?? null : null}
      />
    </div>
  );
}
