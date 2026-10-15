import { PageHeader } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Contractor reports" };

export default async function ContractorReportsPage() {
  await requirePermissionOrRedirect("contractors.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for contractors, engagements, invoices and withholding." />
      <ContractorsSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/contractors/reports/register" title="Contractor register" description="Legal names, PAN/GSTIN and status." />
        <ReportCard href="/api/contractors/reports/engagements" title="Engagements" description="Scope, dates and fees." />
        <ReportCard href="/api/contractors/reports/invoices" title="Invoices" description="Gross, withholding, net and status." />
        <ReportCard href="/api/contractors/reports/withholding" title="Withholding" description="TDS section and amounts by invoice." />
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
