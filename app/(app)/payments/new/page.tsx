import { PageHeader } from "@/components/layout/app-shell";
import { PaymentsSubnav } from "@/components/payments/subnav";
import { PaymentBatchForm } from "@/components/payments/batch-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { loadPaymentsOverview } from "@/lib/payments/query";

export const metadata = { title: "New payment batch" };

export default async function NewPaymentBatchPage() {
  const user = await requirePermissionOrRedirect("payments.create");
  const overview = await loadPaymentsOverview(user.organization.id);

  return (
    <div>
      <PageHeader
        title="New payment batch"
        description="One active batch per finalized payroll run. Invalid bank details are employee-level errors. Exclusion requires a reason and does not change finalized net salary."
      />
      <PaymentsSubnav />
      <PaymentBatchForm
        runs={overview.finalizedRuns}
        defaultMethod={overview.settings.default_method}
        bankAccountReference={overview.settings.bank_account_reference}
      />
    </div>
  );
}
