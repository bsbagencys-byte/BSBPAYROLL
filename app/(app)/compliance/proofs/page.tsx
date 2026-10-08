import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { listTaxDeclarations, listTaxProofs } from "@/lib/statutory/repository";
import { reviewTaxProofFormAction } from "@/actions/statutory";
import { TAX_PROOF_STATUS_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Tax proofs" };

export default async function ComplianceProofsPage() {
  const user = await requirePermissionOrRedirect("compliance.view");
  const [catalog, proofs, declarations] = await Promise.all([
    loadOrgCatalog(user.organization.id),
    listTaxProofs(user.organization.id),
    listTaxDeclarations(user.organization.id),
  ]);
  const canReview = hasPermission(user, "compliance.proofs.review");

  return (
    <div>
      <PageHeader title="Proofs" description="Tax proof files uploaded against declarations. Review does not change payroll until the declaration is approved." />
      <ComplianceSubnav />
      {proofs.length === 0 ? (
        <EmptyState title="No proofs" description="Proof files appear here after employees upload supporting documents." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uploaded</th>
                {canReview ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {proofs.map((item) => {
                const employee = catalog.employees.find((row) => row.id === item.employee_id);
                const declaration = declarations.find((row) => row.id === item.declaration_id);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{employee?.display_name ?? "Employee"}</td>
                    <td className="px-4 py-3">{item.file_name}</td>
                    <td className="px-4 py-3">{declaration?.tax_year ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === "APPROVED" ? "success" : "muted"}>{TAX_PROOF_STATUS_LABELS[item.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">{formatDateOnly(item.created_at)}</td>
                    {canReview && item.status === "PENDING" ? (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <form action={reviewTaxProofFormAction}>
                            <input type="hidden" name="proofId" value={item.id} />
                            <input type="hidden" name="status" value="APPROVED" />
                            <Button type="submit" size="sm">
                              Approve
                            </Button>
                          </form>
                          <form action={reviewTaxProofFormAction}>
                            <input type="hidden" name="proofId" value={item.id} />
                            <input type="hidden" name="status" value="REJECTED" />
                            <Button type="submit" size="sm" variant="outline">
                              Reject
                            </Button>
                          </form>
                        </div>
                      </td>
                    ) : canReview ? (
                      <td className="px-4 py-3">—</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
