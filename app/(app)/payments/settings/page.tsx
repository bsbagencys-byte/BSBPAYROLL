import { PageHeader } from "@/components/layout/app-shell";
import { PaymentsSubnav } from "@/components/payments/subnav";
import { PaymentSettingsForm } from "@/components/payments/settings-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { defaultPaymentSettings } from "@/lib/payments/service";

export const metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  const user = await requirePermissionOrRedirect("payments.create");
  const settings = await defaultPaymentSettings(user.organization.id);

  return (
    <div>
      <PageHeader title="Payment settings" description="Configurable generic bank CSV. No bank-specific formats, Tally, Zoho or direct bank API." />
      <PaymentsSubnav />
      <PaymentSettingsForm settings={settings} />
    </div>
  );
}
