import { PageHeader } from "@/components/layout/app-shell";
import { ExitsSubnav } from "@/components/exits/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "Exit reports" };

export default async function ExitReportsPage() {
  await requirePermissionOrRedirect("exits.view");
  return (
    <div>
      <PageHeader title="Reports" description="CSV exports for the exit register, notice period and clearance." />
      <ExitsSubnav />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard href="/api/exits/reports/register" title="Exit register" description="All exits with type, dates and status." />
        <ReportCard href="/api/exits/reports/notice" title="Notice period" description="Employees currently serving notice." />
        <ReportCard href="/api/exits/reports/clearance" title="Clearance pending" description="Exits waiting on required clearance." />
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
