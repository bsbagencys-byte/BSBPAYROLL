import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { PayrollSubnav } from "@/components/payroll/subnav";
import { StatutoryRuleForm } from "@/components/payroll/statutory-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listStatutoryRules } from "@/lib/payroll/repository";
import { toggleStatutoryRuleAction } from "@/actions/payroll";
import { STATUTORY_HEAD_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Payroll settings" };

export default async function PayrollSettingsPage() {
  const user = await requirePermissionOrRedirect("payroll.view");
  const rules = await listStatutoryRules(user.organization.id);
  const canManage = hasPermission(user, "payroll.settings");

  return (
    <div>
      <PageHeader title="Settings" description="PF, ESI, PT slabs and optional TDS. Attendance still uses leave-written days until Phase 4." />
      <PayrollSubnav />
      {canManage ? (
        <div className="mb-6">
          <StatutoryRuleForm />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Statutory rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState title="No rules" description="Add PF, ESI, PT or TDS rates." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Head</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Rates</th>
                    <th className="py-2 pr-4">Effective</th>
                    <th className="py-2 pr-4">Status</th>
                    {canManage ? <th className="py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{STATUTORY_HEAD_LABELS[item.head]}</td>
                      <td className="py-2 pr-4">{item.name}</td>
                      <td className="py-2 pr-4 text-xs text-slate-600">
                        EE {item.employee_rate}% · ER {item.employer_rate}%
                        {item.wage_ceiling != null ? ` · ceiling ${item.wage_ceiling}` : ""}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {formatDateOnly(item.effective_from)} → {item.effective_to ? formatDateOnly(item.effective_to) : "open"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                      </td>
                      {canManage ? (
                        <td className="py-2 text-right">
                          <form action={toggleStatutoryRuleAction}>
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
