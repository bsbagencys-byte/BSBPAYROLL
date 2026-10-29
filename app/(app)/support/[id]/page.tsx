import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { SupportSubnav } from "@/components/onboarding/subnav";
import { SupportTicketBadge } from "@/components/onboarding/status-badge";
import { SupportReplyForm, SupportStatusForm } from "@/components/onboarding/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITY_LABELS } from "@/lib/constants";
import { getSupportTicket, listSupportMessages } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Support ticket" };

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("support.view");
  const { id } = await params;
  const ticket = await getSupportTicket(user.organization.id, id);
  if (!ticket) notFound();
  const messages = await listSupportMessages(user.organization.id, ticket.id);
  const canManage = hasPermission(user, "support.manage");
  const canReply = hasPermission(user, "support.create") || canManage;
  const visible = messages.filter((row) => row.visibility === "CUSTOMER");

  return (
    <div>
      <PageHeader title={ticket.ticket_number} description={ticket.subject} />
      <SupportSubnav />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle></CardHeader>
          <CardContent><SupportTicketBadge status={ticket.status} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Category</CardTitle></CardHeader>
          <CardContent>{SUPPORT_CATEGORY_LABELS[ticket.category]}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Priority</CardTitle></CardHeader>
          <CardContent>{SUPPORT_PRIORITY_LABELS[ticket.priority]}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">SLA</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : "—"}</p>
            {ticket.sla_breached ? <p className="text-xs text-red-700">Breached</p> : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {visible.length === 0 ? <p className="text-sm text-slate-500">No customer-visible messages.</p> : null}
          {visible.map((message) => (
            <div key={message.id} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{formatDateTime(message.created_at)}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      {canManage ? <div className="mb-6"><SupportStatusForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} /></div> : null}
      {canReply ? <SupportReplyForm ticketId={ticket.id} /> : null}
    </div>
  );
}
