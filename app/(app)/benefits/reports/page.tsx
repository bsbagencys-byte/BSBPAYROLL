import { PageHeader } from "@/components/layout/app-shell";
import { BenefitsSubnav } from "@/components/benefits/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Benefit reports" };

export default async function BenefitReportsPage() {
  await requirePermissionOrRedirect("benefits.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for benefit types and employee assignments." />
      <BenefitsSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/benefits/reports/types" title="Benefit types" description="Definitions, categories and tax treatment." />
        <ReportCard href="/api/benefits/reports/assignments" title="Employee benefits" description="Assignments with amounts, methods and effective dates." />
      </div>
    </div>
  );
}

function ReportCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{description}</p>
        <a href={href} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
          Download CSV
        </a>
      </CardContent>
    </Card>
  );
}
