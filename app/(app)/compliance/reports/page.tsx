import { PageHeader } from "@/components/layout/app-shell";
import { ComplianceSubnav } from "@/components/compliance/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Compliance reports" };

export default async function ComplianceReportsPage() {
  await requirePermissionOrRedirect("compliance.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for PF, ESI, PT, LWF and TDS filings generated when payroll is processed." />
      <ComplianceSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/compliance/reports/pf" title="PF" description="EPF employee and employer amounts by filing period." />
        <ReportCard href="/api/compliance/reports/esi" title="ESI" description="ESI contributions by filing period." />
        <ReportCard href="/api/compliance/reports/pt" title="Professional tax" description="PT deducted by filing period." />
        <ReportCard href="/api/compliance/reports/lwf" title="LWF" description="Labour Welfare Fund employee and employer amounts." />
        <ReportCard href="/api/compliance/reports/tds" title="TDS" description="TDS deducted by filing period." />
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
