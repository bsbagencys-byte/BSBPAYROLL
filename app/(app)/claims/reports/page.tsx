import { PageHeader } from "@/components/layout/app-shell";
import { ClaimsSubnav } from "@/components/claims/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Claim reports" };

export default async function ClaimReportsPage() {
  await requirePermissionOrRedirect("claims.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for claims, approvals and policies." />
      <ClaimsSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/claims/reports/claims" title="All claims" description="Every claim with amounts, status and step." />
        <ReportCard href="/api/claims/reports/pending" title="Pending claims" description="Submitted or awaiting approval." />
        <ReportCard href="/api/claims/reports/approved" title="Approved claims" description="Approved and ready for payroll." />
        <ReportCard href="/api/claims/reports/policies" title="Claim policies" description="Limits, rates and effective dates." />
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
