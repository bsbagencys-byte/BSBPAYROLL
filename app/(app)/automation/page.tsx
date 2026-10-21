import { PageHeader } from "@/components/layout/app-shell";
import { AutomationSubnav } from "@/components/automation/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listAutomationRules, listAutomationTasks, listRuleRuns } from "@/lib/automation/rules";
import { listScheduledJobs, listJobExecutions, ensureDefaultJobs } from "@/lib/jobs/service";
import { listDomainEvents } from "@/lib/events/repository";
import { runJobsNowAction } from "@/actions/automation";

export const metadata = { title: "Automation" };

export default async function AutomationPage() {
  const user = await requirePermissionOrRedirect("automation.view");
  await ensureDefaultJobs(user.organization.id, user.id);
  const [rules, tasks, runs, jobs, executions, events] = await Promise.all([
    listAutomationRules(user.organization.id),
    listAutomationTasks(user.organization.id),
    listRuleRuns(user.organization.id, 10),
    listScheduledJobs(user.organization.id),
    listJobExecutions(user.organization.id, 10),
    listDomainEvents(user.organization.id, 10),
  ]);
  const canRun = hasPermission(user, "automation.jobs.retry") || hasPermission(user, "automation.manage");

  return (
    <div>
      <PageHeader
        title="Automation"
        description="Predefined triggers and actions only. No arbitrary SQL or code. Sensitive payroll create/finalize never runs from a rule."
        actions={
          canRun ? (
            <form action={runJobsNowAction}>
              <Button type="submit" variant="outline">
                Run due jobs
              </Button>
            </form>
          ) : null
        }
      />
      <AutomationSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Rules" value={rules.length} />
        <Stat title="Enabled jobs" value={jobs.filter((item) => item.enabled).length} />
        <Stat title="Open tasks" value={tasks.filter((item) => item.status === "OPEN").length} />
        <Stat title="Recent events" value={events.length} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent rule runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">No rule runs yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {runs.map((item) => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span>{item.status}</span>
                    <span className="text-xs text-slate-500">{item.created_at.slice(0, 16)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent job executions</CardTitle>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <p className="text-sm text-slate-500">No executions yet. Jobs run when due, not from in-request timers.</p>
            ) : (
              <ul className="divide-y text-sm">
                {executions.map((item) => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span>{item.status}</span>
                    <span className="text-xs text-slate-500">{item.created_at.slice(0, 16)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
