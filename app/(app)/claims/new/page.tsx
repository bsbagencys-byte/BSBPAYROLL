import { PageHeader } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { ClaimForm } from "@/components/claims/claim-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadClaimsCatalog } from "@/lib/claims/query";

export const metadata = { title: "New claim" };

export default async function NewClaimPage() {
  const user = await requirePermissionOrRedirect("claims.create");
  const catalog = await loadClaimsCatalog(user.organization.id);
  const self = catalog.employees.find((item) => item.user_id === user.id) ?? null;
  const isEmployee = user.roleCode === "EMPLOYEE";

  return (
    <div>
      <PageHeader title="New claim" description="Raise a reimbursement or TA/DA claim. Drafts can be submitted once receipts are attached." />
      <ClaimsSubnav />
      <ClaimForm
        types={catalog.types.filter((item) => item.status === "ACTIVE")}
        employees={catalog.employees}
        lockedEmployeeId={isEmployee ? self?.id ?? null : null}
      />
    </div>
  );
}
