import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/leave/engine";
import { ensureBalanceViews, loadRequestItems } from "@/lib/leave/query";
import { listHolidays } from "@/lib/leave/repository";
import { listAttendanceDays } from "@/lib/leave/attendance";
import { loadOrgCatalog } from "@/lib/org-data";
import { ATTENDANCE_DAY_STATUS_LABELS, LEAVE_REQUEST_STATUS_LABELS } from "@/lib/constants";

export async function leaveCsvResponse(kind: "requests" | "balances" | "holidays" | "attendance") {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "leave.view")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = user.organization.id;
  let csv = "";
  let filename = "leave.csv";

  if (kind === "requests") {
    const rows = await loadRequestItems(orgId, user.organization.timezone);
    csv = toCsv(
      ["Employee", "Code", "Type", "From", "To", "Session", "Days", "Status", "Reason"],
      rows.map((item) => [
        item.employeeName,
        item.employeeCode,
        item.leaveTypeName,
        item.fromDate,
        item.toDate,
        item.session,
        item.days,
        LEAVE_REQUEST_STATUS_LABELS[item.status],
        item.reason,
      ])
    );
    filename = "leave-requests.csv";
  } else if (kind === "balances") {
    const rows = await ensureBalanceViews(orgId, user.organization.timezone);
    csv = toCsv(
      ["Employee", "Code", "Type", "Year", "Opening", "Allocated", "Accrued", "Used", "Pending", "CarryForward", "Adjusted", "Available"],
      rows.map((item) => [
        item.employeeName,
        item.employeeCode,
        item.leaveTypeName,
        item.year,
        item.opening,
        item.allocated,
        item.accrued,
        item.used,
        item.pending,
        item.carryForward,
        item.adjusted,
        item.available,
      ])
    );
    filename = "leave-balances.csv";
  } else if (kind === "holidays") {
    const rows = await listHolidays(orgId);
    csv = toCsv(
      ["Date", "Name", "Type", "Optional", "Status"],
      rows.map((item) => [item.holiday_date, item.name, item.holiday_type, item.optional ? "Yes" : "No", item.status])
    );
    filename = "holidays.csv";
  } else {
    const [days, catalog] = await Promise.all([listAttendanceDays(orgId), loadOrgCatalog(orgId)]);
    csv = toCsv(
      ["Employee", "Code", "Date", "Session", "Status", "Source"],
      days.map((item) => {
        const employee = catalog.employees.find((row) => row.id === item.employee_id);
        return [
          employee?.display_name ?? "",
          employee?.employee_code ?? "",
          item.work_date,
          item.session,
          ATTENDANCE_DAY_STATUS_LABELS[item.status] ?? item.status,
          item.source,
        ];
      })
    );
    filename = "leave-attendance-days.csv";
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
