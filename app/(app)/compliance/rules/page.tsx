import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { StatutoryRuleVersionForm } from "@/components/compliance/rule-version-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listStatutoryRuleVersions } from "@/lib/statutory/repository";
import { toggleStatutoryRuleVersionAction } from "@/actions/statutory";
import { STATUTORY_HEAD_LABELS, STATUTORY_RULE_STATUS_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Statutory rules" };

export default async function ComplianceRulesPage() {
  const user = await requirePermissionOrRedirect("compliance.view");
  const versions = await listStatutoryRuleVersions(user.organization.id);
  const canManage = hasPermission(user, "compliance.rules.manage");

  return (
    <div>
      <PageHeader
        title="Rule versions"
        description="Versioned PF, ESI, PT, LWF and TDS rules. Unverified versions warn in payroll and do not invent rates."
      />
      <ComplianceSubnav />
      {canManage ? (
        <div className="mb-6">
          <StatutoryRuleVersionForm />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <EmptyState title="No versions" description="Add a versioned rule. Payroll falls back to Phase 9 statutory_rules until a version is ACTIVE." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Head</th>
                    <th className="py-2 pr-4">Version</th>
                    <th className="py-2 pr-4">Effective</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Status</th>
                    {canManage ? <th className="py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {versions.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{STATUTORY_HEAD_LABELS[item.head]}</td>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{item.version_code}</p>
                        <p className="text-xs text-slate-500">{item.name}</p>
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {formatDateOnly(item.effective_from)} → {item.effective_to ? formatDateOnly(item.effective_to) : "open"}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {item.verified ? "Verified" : "Unverified"}
                        {item.source_name ? ` · ${item.source_name}` : ""}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{STATUTORY_RULE_STATUS_LABELS[item.status]}</Badge>
                      </td>
                      {canManage ? (
                        <td className="py-2 text-right">
                          <form action={toggleStatutoryRuleVersionAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="status" value={item.status} />
                            <Button type="submit" size="sm" variant="outline">
                              {item.status === "ACTIVE" ? "Disable" : "Activate"}
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
