import { PageHeader } from "@/components/layout/app-shell";
import { AdminSubscriptionSubnav } from "@/components/billing/subnav";
import { PlanForm } from "@/components/billing/plan-form";
import { PlanBadge } from "@/components/billing/status-badge";
import { PlatformBillingForm } from "@/components/billing/subscription-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { listPlanPriceHistory, listPlans } from "@/lib/billing/repository";
import { platformSettings } from "@/lib/billing/service";
import { retirePlanAction } from "@/actions/billing";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Subscription plans" };

export default async function AdminPlansPage() {
  await requirePlatformAdmin();
  const [plans, settings] = await Promise.all([listPlans(), platformSettings()]);
  const histories = await Promise.all(plans.map((plan) => listPlanPriceHistory(plan.id)));

  return (
    <div>
      <PageHeader title="Plans" description="Configurable packages. Editing a price preserves the previous amount for existing subscriptions and issued invoices." />
      <AdminSubscriptionSubnav />
      <PlanForm />
      <div className="mt-8">
        <PlatformBillingForm settings={settings} />
      </div>
      <div className="mt-8 space-y-4">
        {plans.map((plan, index) => {
          const history = histories[index] ?? [];
          return (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{plan.name} ({plan.code})</CardTitle>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>
                <PlanBadge status={plan.status} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  {formatCurrency(plan.monthly_price, plan.currency)} / month · {formatCurrency(plan.annual_price, plan.currency)} / year · trial {plan.trial_days} days
                </p>
                <p>
                  Employees {plan.employee_limit ?? "unlimited"} · Branches {plan.branch_limit ?? "unlimited"} · Devices {plan.biometric_device_limit ?? "unlimited"}
                </p>
                {history.length > 0 ? (
                  <p className="text-xs text-slate-500">
                    Previous price {formatCurrency(history[0].monthly_price, history[0].currency)} / month retained on {history[0].created_at.slice(0, 10)}.
                  </p>
                ) : null}
                {plan.status !== "RETIRED" ? (
                  <form
                    action={async () => {
                      "use server";
                      await retirePlanAction(plan.id);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm">Retire plan</Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
