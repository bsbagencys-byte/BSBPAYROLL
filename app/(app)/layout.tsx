import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getLatestSubscription, getOpenSubscription } from "@/lib/billing/repository";
import { RESTRICTED_SUBSCRIPTION_STATUSES } from "@/lib/constants";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const open = await getOpenSubscription(user.organization.id);
  const latest = open ?? (await getLatestSubscription(user.organization.id));
  const subscriptionRestricted = Boolean(
    latest && RESTRICTED_SUBSCRIPTION_STATUSES.includes(latest.status)
  );
  return (
    <AppShell user={user} subscriptionRestricted={subscriptionRestricted}>
      {children}
    </AppShell>
  );
}
