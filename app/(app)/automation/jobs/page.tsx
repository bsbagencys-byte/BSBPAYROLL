import { PageHeader } from "@/components/layout/app-shell";
import { AutomationSubnav } from "@/components/automation/subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { ensureDefaultJobs, listJobExecutions, listScheduledJobs } from "@/lib/jobs/service";
import { cancelJobAction, retryJobAction, runJobsNowAction, toggleJobAction } from "@/actions/automation";
import { JOB_TYPE_LABELS, type JobType } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Scheduled jobs" };

export default async function AutomationJobsPage() {
  const user = await requirePermissionOrRedirect("automation.jobs.view");
  await ensureDefaultJobs(user.organization.id, user.id);
  const [jobs, executions] = await Promise.all([
    listScheduledJobs(user.organization.id),
    listJobExecutions(user.organization.id, 30),
  ]);
  const canManage = hasPermission(user, "automation.manage");
  const canRetry = hasPermission(user, "automation.jobs.retry");

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Durable claimed executions. No in-request timers. Failed jobs retry with backoff; they are not marked successful."
        actions={
          canRetry || canManage ? (
            <form action={runJobsNowAction}>
              <Button type="submit">Run due jobs</Button>
            </form>
          ) : null
        }
      />
      <AutomationSubnav />
      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{JOB_TYPE_LABELS[job.job_type as JobType] ?? job.name}</p>
                  <p className="text-xs text-slate-500">
                    Next {job.next_run_at ? formatDateTime(job.next_run_at, user.organization.timezone) : "—"} · last {job.last_status ?? "never"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{job.enabled ? "Enabled" : "Disabled"}</Badge>
                  {canManage ? (
                    <form action={toggleJobAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <input type="hidden" name="enabled" value={job.enabled ? "false" : "true"} />
                      <Button type="submit" size="sm" variant="outline">
                        {job.enabled ? "Disable" : "Enable"}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <p className="text-sm text-slate-500">No executions yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {executions.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{item.status}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(item.created_at, user.organization.timezone)}
                      {item.error_message ? ` · ${item.error_message}` : ""}
                    </p>
                  </div>
                  {canRetry && item.status === "FAILED" ? (
                    <div className="flex gap-2">
                      <form action={retryJobAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Retry
                        </Button>
                      </form>
                      <form action={cancelJobAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Cancel
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
