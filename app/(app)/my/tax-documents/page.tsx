import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfTaxDocuments } from "@/lib/ess/query";
import { TAX_REGIME_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My tax documents" };

export default async function MyTaxDocumentsPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const data = await loadSelfTaxDocuments(user.organization.id, identity.employee.id);

  return (
    <div>
      <PageHeader
        title="My tax documents"
        description="Investment declarations and proofs recorded against your employee profile."
      />

      {data.declarations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            No tax declarations are recorded for you yet. Declarations are managed by payroll.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.declarations.map((declaration) => {
            const items = data.items.filter((item) => item.declaration_id === declaration.id);
            const proofs = data.proofs.filter((item) => item.declaration_id === declaration.id);
            const declared = items.reduce((sum, item) => sum + item.amount, 0);
            return (
              <Card key={declaration.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>{declaration.tax_year}</CardTitle>
                    <p className="text-xs text-slate-500">{TAX_REGIME_LABELS[declaration.regime]}</p>
                  </div>
                  <EssStatusBadge status={declaration.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total declared</span>
                    <span className="font-medium">{formatCurrency(declared)}</span>
                  </div>
                  {items.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                          <span>
                            {item.section_code} · {item.name}
                          </span>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {proofs.length > 0 ? (
                    <div className="space-y-2">
                      {proofs.map((proof) => (
                        <div key={proof.id} className="flex items-center justify-between text-xs text-slate-500">
                          <span>Proof: {proof.file_name}</span>
                          <span className="flex items-center gap-2">
                            {proof.reviewed_at ? <span>reviewed {formatDateOnly(proof.reviewed_at)}</span> : null}
                            <EssStatusBadge status={proof.status} />
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {declaration.review_note ? (
                    <Alert variant="info">Reviewer note: {declaration.review_note}</Alert>
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
