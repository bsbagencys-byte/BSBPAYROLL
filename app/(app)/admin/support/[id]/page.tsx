import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { AdminSupportSubnav } from "@/components/onboarding/subnav";
import { SupportTicketBadge } from "@/components/onboarding/status-badge";
import { SupportReplyForm, SupportStatusForm } from "@/components/onboarding/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITY_LABELS } from "@/lib/constants";
import { listAllSupportTickets, listSupportMessages } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Platform ticket" };

export default async function AdminSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const tickets = await listAllSupportTickets();
  const ticket = tickets.find((row) => row.id === id) ?? null;
  if (!ticket) notFound();
  const messages = await listSupportMessages(ticket.organization_id, ticket.id);

  return (
    <div>
      <PageHeader title={ticket.ticket_number} description={`${ticket.subject}. Internal notes are not shown to the customer.`} />
      <AdminSupportSubnav />
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
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Organization</CardTitle></CardHeader>
          <CardContent className="font-mono text-xs">{ticket.organization_id}</CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">
                {formatDateTime(message.created_at)} · {message.visibility === "INTERNAL" ? "Internal" : "Customer"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="mb-6">
        <SupportStatusForm ticketId={ticket.id} organizationId={ticket.organization_id} closed={ticket.status === "CLOSED"} />
      </div>
      <SupportReplyForm ticketId={ticket.id} platform />
    </div>
  );
}
