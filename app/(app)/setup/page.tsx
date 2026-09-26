import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { PageHeader } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Company setup" };

export default async function SetupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.organization.setup_completed) redirect("/dashboard");

  let branch = user.branch;
  let department = null;
  let designation = null;
  const organization = user.organization;

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    department = store.departments[0] ?? null;
    designation = store.designations[0] ?? null;
    branch = store.branches[0] ?? branch;
  } else {
    const admin = createAdminClient();
    if (admin) {
      const orgId = user.organization.id;
      const [{ data: dept }, { data: desig }, { data: br }] = await Promise.all([
        admin.from("departments").select("*").eq("organization_id", orgId).eq("is_default", true).maybeSingle(),
        admin.from("designations").select("*").eq("organization_id", orgId).eq("is_default", true).maybeSingle(),
        admin.from("branches").select("*").eq("organization_id", orgId).eq("is_default", true).maybeSingle(),
      ]);
      department = dept;
      designation = desig;
      branch = br ?? branch;
    }
  }

  return (
    <div>
      <PageHeader title="Company setup" description="Complete these steps before using the rest of BSB Payroll." />
      <SetupWizard organization={organization} branch={branch} department={department} designation={designation} />
    </div>
  );
}
