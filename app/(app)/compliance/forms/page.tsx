import { PageHeader } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Compliance forms" };

export default async function ComplianceFormsPage() {
  await requirePermissionOrRedirect("compliance.view");
  return (
    <div>
      <PageHeader title="Forms" description="Challan and return worksheets from processed payroll. These are working copies, not filed returns." />
      <ComplianceSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <FormCard title="EPF ECR worksheet" href="/api/compliance/reports/pf" description="Employee and employer PF amounts for ECR preparation." />
        <FormCard title="ESI contribution worksheet" href="/api/compliance/reports/esi" description="ESI wages and contributions for the latest processed run." />
        <FormCard title="PT worksheet" href="/api/compliance/reports/pt" description="Professional tax by period for challan preparation." />
        <FormCard title="LWF worksheet" href="/api/compliance/reports/lwf" description="Labour Welfare Fund employee and employer amounts." />
        <FormCard title="TDS worksheet" href="/api/compliance/reports/tds" description="TDS deducted by employee for Form 24Q preparation." />
      </div>
    </div>
  );
}

function FormCard({ href, title, description }: { href: string; title: string; description: string }) {
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
