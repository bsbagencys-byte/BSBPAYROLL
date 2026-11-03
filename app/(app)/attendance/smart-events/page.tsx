import { PageHeader } from "@/components/layout/app-shell";
import { CorrectEventForm, VerifyEventForm } from "@/components/smart-attendance/forms";
import { RiskBadge, SmartEventBadge } from "@/components/smart-attendance/status-badge";
import { SmartAttendanceSubnav } from "@/components/smart-attendance/subnav";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { SMART_EVENT_SOURCE_LABELS } from "@/lib/constants";
import { loadOrgCatalog } from "@/lib/org-data";
import { loadSmartDashboard } from "@/lib/smart-attendance/service";
import { formatDateTime, lookupName } from "@/lib/utils";

export const metadata = { title: "Smart events" };

export default async function SmartEventsPage() {
  const user = await requirePermissionOrRedirect("attendance.smart.view");
  const [data, catalog] = await Promise.all([
    loadSmartDashboard(user.organization.id),
    loadOrgCatalog(user.organization.id),
  ]);
  const canCorrect = hasPermission(user, "attendance.correct");

  return (
    <div>
      <PageHeader
        title="Smart events"
        description="Server-validated candidates. Accepted events become punches. Finalized attendance days are not rewritten."
      />
      <SmartAttendanceSubnav />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Review</th>
            </tr>
          </thead>
          <tbody>
            {data.events.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No events yet.</td></tr>
            ) : data.events.map((event) => (
              <tr key={event.id} className="border-b last:border-0 align-top">
                <td className="px-4 py-3 text-slate-600">{formatDateTime(event.occurred_at)}</td>
                <td className="px-4 py-3">{lookupName(catalog.employees, event.employee_id) ?? event.employee_id}</td>
                <td className="px-4 py-3">
                  <p>{SMART_EVENT_SOURCE_LABELS[event.source]} · {event.direction}</p>
                  <p className="text-xs text-slate-500">{event.risk_reasons[0] ?? "No extra signals"}</p>
                </td>
                <td className="px-4 py-3"><RiskBadge risk={event.risk_level} /></td>
                <td className="px-4 py-3"><SmartEventBadge status={event.status} /></td>
                <td className="px-4 py-3">
                  {canCorrect && (event.status === "PENDING_REVIEW" || event.status === "PENDING_VERIFICATION" || event.status === "FLAGGED") ? (
                    <>
                      <VerifyEventForm eventId={event.id} />
                      <CorrectEventForm eventId={event.id} />
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">{event.punch_id ? "Punch recorded" : "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
