import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { AdminSupportSubnav } from "@/components/onboarding/subnav";
import { SupportTicketBadge } from "@/components/onboarding/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITY_LABELS } from "@/lib/constants";
import { listAllSupportTickets } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Platform support" };

export default async function AdminSupportPage() {
  await requirePlatformAdmin();
  const tickets = await listAllSupportTickets();
  const open = tickets.filter((row) => row.status !== "RESOLVED" && row.status !== "CLOSED");

  return (
    <div>
      <PageHeader
        title="Platform support"
        description="SUPER_ADMIN only. Tickets stay org-isolated. This is not impersonation."
      />
      <AdminSupportSubnav />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Tickets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{tickets.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Open</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{open.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">SLA breached</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{open.filter((row) => row.sla_breached).length}</p></CardContent>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No tickets.</td></tr>
            ) : tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/support/${ticket.id}`} className="font-medium text-brand-700 hover:underline">{ticket.ticket_number}</Link>
                  <p className="text-xs text-slate-500">{ticket.subject}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{ticket.organization_id.slice(0, 8)}</td>
                <td className="px-4 py-3">{SUPPORT_CATEGORY_LABELS[ticket.category]}</td>
                <td className="px-4 py-3">{SUPPORT_PRIORITY_LABELS[ticket.priority]}</td>
                <td className="px-4 py-3"><SupportTicketBadge status={ticket.status} /></td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(ticket.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
