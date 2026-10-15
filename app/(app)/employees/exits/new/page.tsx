import { PageHeader } from "@/components/layout/app-shell";
import { ExitsSubnav } from "@/components/exits/subnav";
import { ExitForm } from "@/components/exits/exit-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadOrgCatalog } from "@/lib/org-data";

export const metadata = { title: "New employee exit" };

export default async function NewExitPage() {
  const user = await requirePermissionOrRedirect("exits.create");
  const catalog = await loadOrgCatalog(user.organization.id);
  return (
    <div>
      <PageHeader title="New exit" description="Capture notice and last working date. Status changes only after approval." />
      <ExitsSubnav />
      <ExitForm employees={catalog.employees.filter((item) => item.status === "ACTIVE" || item.status === "ON_NOTICE")} />
    </div>
  );
}
