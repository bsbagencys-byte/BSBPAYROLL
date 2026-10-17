import { PageHeader } from "@/components/layout/app-shell";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfSalary } from "@/lib/ess/query";
import { SALARY_COMPONENT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "My salary" };

export default async function MySalaryPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const data = await loadSelfSalary(user.organization.id, identity.employee.id, user.organization.timezone);
  const snapshot = data.snapshot;

  return (
    <div>
      <PageHeader
        title="My salary"
        description="Your current compensation structure. Salary is effective-date based and read-only here; revisions are managed by payroll."
      />

      {!snapshot ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            No active salary structure is assigned to your record yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat title="Annual CTC" value={formatCurrency(snapshot.ctc)} />
            <Stat title="Monthly gross" value={formatCurrency(snapshot.gross)} />
            <Stat title="Fixed earnings" value={formatCurrency(snapshot.fixedEarnings)} />
            <Stat title="Deductions" value={formatCurrency(snapshot.deductions)} />
          </div>

          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{snapshot.structureName}</CardTitle>
              <Badge variant="muted">from {formatDateOnly(snapshot.effectiveFrom)}</Badge>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {snapshot.lines.map((line) => (
                  <div key={line.componentId} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-slate-500">
                        {SALARY_COMPONENT_TYPE_LABELS[line.componentType]} · {line.code}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(line.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Revision history</CardTitle>
        </CardHeader>
        <CardContent>
          {data.revisions.length === 0 ? (
            <p className="text-sm text-slate-500">No revisions recorded.</p>
          ) : (
            <div className="space-y-3">
              {data.revisions.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {item.previous_ctc != null ? formatCurrency(item.previous_ctc) : "—"} → {formatCurrency(item.new_ctc)}
                    </p>
                    <p className="text-xs text-slate-500">Effective {formatDateOnly(item.effective_from)}</p>
                  </div>
                  <EssStatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
