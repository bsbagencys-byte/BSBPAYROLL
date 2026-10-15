import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ExitsSubnav } from "@/components/exits/subnav";
import { ExitStatusBadge, ClearanceTaskBadge } from "@/components/exits/status-badge";
import { ExitForm } from "@/components/exits/exit-form";
import { ExitDecisionForm } from "@/components/exits/decision-form";
import { ClearanceTaskForm } from "@/components/exits/clearance-task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadExitDetail, loadExitsCatalog } from "@/lib/exits/query";
import { cancelExitAction, submitExitAction } from "@/actions/exits";
import { CLEARANCE_DEPARTMENT_LABELS, EXIT_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Employee exit" };

export default async function ExitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("exits.view");
  const { id } = await params;
  const [detail, catalog] = await Promise.all([
    loadExitDetail(user.organization.id, id, user.organization.timezone),
    loadExitsCatalog(user.organization.id),
  ]);
  if (!detail.row) notFound();
  const exit = detail.row.exit;
  const canEdit = hasPermission(user, "exits.edit") || hasPermission(user, "exits.create");
  const canApprove = hasPermission(user, "exits.approve");
  const canCancel = hasPermission(user, "exits.cancel");

  return (
    <div>
      <PageHeader
        title={exit.reference_number ?? "Exit"}
        description={`${detail.row.employeeName} (${detail.row.employeeCode})`}
        actions={
          <Link href="/employees/exits">
            <Button variant="outline">Back to exits</Button>
          </Link>
        }
      />
      <ExitsSubnav />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              <ExitStatusBadge status={exit.status} />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Type" value={EXIT_TYPE_LABELS[exit.exit_type]} />
                <Detail label="Notice date" value={formatDateOnly(exit.notice_date)} />
                <Detail label="Last working date" value={formatDateOnly(exit.last_working_date)} />
                <Detail label="Notice period" value={`${exit.notice_period_days} days`} />
                <Detail label="Notice served" value={`${exit.notice_served_days} days`} />
                <Detail label="Reason" value={exit.reason ?? "—"} />
              </dl>
              {exit.remarks ? <p className="mt-4 text-sm text-slate-600">{exit.remarks}</p> : null}
            </CardContent>
          </Card>

          {canEdit && exit.status === "DRAFT" ? <ExitForm row={exit} employees={catalog.employees} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Clearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.tasks.length === 0 ? (
                <p className="text-sm text-slate-500">Clearance tasks are created after approval.</p>
              ) : (
                detail.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-xs text-slate-500">
                          {CLEARANCE_DEPARTMENT_LABELS[task.department]}
                          {task.required ? " · Required" : " · Optional"}
                          {task.due_date ? ` · due ${formatDateOnly(task.due_date)}` : ""}
                        </p>
                      </div>
                      <ClearanceTaskBadge status={task.status} />
                    </div>
                    <ClearanceTaskForm task={task} canEdit={canEdit} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {exit.status === "DRAFT" && canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Submit</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={submitExitAction}>
                  <input type="hidden" name="id" value={exit.id} />
                  <Button type="submit">Submit for approval</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          {exit.status === "SUBMITTED" ? (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <ExitDecisionForm exitId={exit.id} canApprove={canApprove} />
              </CardContent>
            </Card>
          ) : null}
          {detail.settlement ? (
            <Card>
              <CardHeader>
                <CardTitle>Settlement</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/settlements/${detail.settlement.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  {detail.settlement.reference_number}
                </Link>
              </CardContent>
            </Card>
          ) : exit.status === "SETTLEMENT_PENDING" ? (
            <Card>
              <CardHeader>
                <CardTitle>Settlement</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/settlements/new" className="text-sm font-medium text-brand-700 hover:underline">
                  Create F&F settlement
                </Link>
              </CardContent>
            </Card>
          ) : null}
          {canCancel && exit.status !== "SETTLED" && exit.status !== "CANCELLED" ? (
            <Card>
              <CardHeader>
                <CardTitle>Cancel</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={cancelExitAction} className="space-y-2">
                  <input type="hidden" name="id" value={exit.id} />
                  <input name="reason" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" placeholder="Reason" />
                  <Button type="submit" variant="destructive">
                    Cancel exit
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
