import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { HolidayForm } from "@/components/leave/holiday-form";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listHolidays } from "@/lib/leave/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { HOLIDAY_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly, lookupName } from "@/lib/utils";

export const metadata = { title: "Holidays" };

export default async function HolidaysPage() {
  const user = await requirePermissionOrRedirect("leave.view");
  const [holidays, catalog] = await Promise.all([listHolidays(user.organization.id), loadOrgCatalog(user.organization.id)]);
  const canManage = hasPermission(user, "leave.calendar.manage");

  return (
    <div>
      <PageHeader title="Holidays" description="National, regional, optional and company holidays. These days do not become ABSENT." />
      <LeaveSubnav />
      {canManage ? <div className="mb-6"><HolidayForm branches={catalog.branches} locations={catalog.locations} /></div> : null}
      {holidays.length === 0 ? (
        <EmptyState title="No holidays" description="Add Republic Day, company holidays and optional days." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{formatDateOnly(item.holiday_date)}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{HOLIDAY_TYPE_LABELS[item.holiday_type]}</td>
                  <td className="px-4 py-3">
                    {lookupName(catalog.branches, item.branch_id) ?? lookupName(catalog.locations, item.location_id) ?? "Organisation"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                    {item.optional ? <Badge variant="warning" className="ml-2">Optional</Badge> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
