import { PageHeader } from "@/components/layout/app-shell";
import { AutomationSubnav } from "@/components/automation/subnav";
import { RuleForm } from "@/components/automation/rule-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listAutomationRules } from "@/lib/automation/rules";
import { toggleRuleAction } from "@/actions/automation";
import { AUTOMATION_TRIGGER_LABELS, type AutomationTriggerType } from "@/lib/constants";

export const metadata = { title: "Automation rules" };

export default async function AutomationRulesPage() {
  const user = await requirePermissionOrRedirect("automation.view");
  const rules = await listAutomationRules(user.organization.id);
  const canManage = hasPermission(user, "automation.manage");

  return (
    <div>
      <PageHeader title="Rules" description="Triggers, conditions and actions are predefined. Rules cannot create or finalize payroll." />
      <AutomationSubnav />
      {canManage ? <RuleForm /> : null}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Saved rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-slate-500">No rules yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {rules.map((rule) => (
                <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-slate-500">
                      {AUTOMATION_TRIGGER_LABELS[rule.trigger_type as AutomationTriggerType] ?? rule.trigger_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{rule.enabled ? "Enabled" : "Disabled"}</Badge>
                    {canManage ? (
                      <form action={toggleRuleAction}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="enabled" value={rule.enabled ? "false" : "true"} />
                        <Button type="submit" size="sm" variant="outline">
                          {rule.enabled ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
