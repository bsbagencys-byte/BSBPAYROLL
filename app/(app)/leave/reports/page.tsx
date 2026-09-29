import { PageHeader } from "@/components/layout/app-shell";
import { LeaveSubnav } from "@/components/leave/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Leave reports" };

export default async function LeaveReportsPage() {
  await requirePermissionOrRedirect("leave.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for requests, balances, holidays and attendance-day marks written by leave." />
      <LeaveSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/leave/reports/requests" title="Leave requests" description="All requests with employee, type, dates, days and status." />
        <ReportCard href="/api/leave/reports/balances" title="Balances" description="Opening, allocated, used, pending and available by employee." />
        <ReportCard href="/api/leave/reports/holidays" title="Holidays" description="Holiday calendar for the organisation." />
        <ReportCard href="/api/leave/reports/attendance" title="Attendance days" description="Days marked PAID_LEAVE, UNPAID_LEAVE, HALF_DAY or COMP_OFF." />
      </div>
    </div>
  );
}

function ReportCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{description}</p>
        <a href={href} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
          Download CSV
        </a>
      </CardContent>
    </Card>
  );
}
