import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { ReportsSubnav } from "@/components/reports/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { REPORT_GROUPS, REPORTS } from "@/lib/reports/catalog";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("reports.view");
  const params = await searchParams;
  const groupParam = Array.isArray(params.group) ? params.group[0] : params.group;
  const groups = groupParam ? REPORT_GROUPS.filter((group) => group.id === groupParam) : REPORT_GROUPS;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="HR, leave, payroll, compliance, claims, exits and biometric reports from stored data. Late, OT and punch-based LOP wait for Phase 4."
      />
      <Suspense>
        <ReportsSubnav />
      </Suspense>
      <div className="space-y-8">
        {groups.map((group) => {
          const items = REPORTS.filter((item) => item.group === group.id).filter(
            (item) => hasPermission(user, item.permission) || hasPermission(user, "reports.view")
          );
          if (!items.length) return null;
          return (
            <section key={group.id}>
              <h2 className="mb-1 text-lg font-semibold">{group.title}</h2>
              <p className="mb-3 text-sm text-slate-500">{group.description}</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.key}>
                    <CardHeader>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600">{item.description}</p>
                      <Link href={`/reports/${item.key}`} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
                        Open report
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
