import { PageHeader } from "@/components/layout/app-shell";
import { SupportSubnav } from "@/components/onboarding/subnav";
import { NewTicketForm } from "@/components/onboarding/forms";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "New support ticket" };

export default async function NewSupportTicketPage() {
  await requirePermissionOrRedirect("support.create");
  return (
    <div>
      <PageHeader title="New ticket" description="Tickets stay inside this organization. Internal notes are platform-only." />
      <SupportSubnav />
      <NewTicketForm />
    </div>
  );
}
