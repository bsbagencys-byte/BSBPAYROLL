import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DeveloperSubnav } from "@/components/developers/subnav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";

export const metadata = { title: "API docs" };

export default async function ApiDocsPage() {
  await requirePermissionOrRedirect("developers.view");
  return (
    <div>
      <PageHeader title="API docs" description="Read-only org-scoped REST. Authentication is Bearer bsb_live_… Keys cannot write payroll or bypass RLS." />
      <SettingsSubnav pathname="/settings/developers" />
      <DeveloperSubnav />
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>Authorization: Bearer &lt;api key&gt; or x-api-key. Rate limit is per key (default 60/min). Every response includes x-request-id.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>GET /api/v1/employees — employees.read</li>
            <li>GET /api/v1/organization — organization.read</li>
            <li>GET /api/v1/attendance/summaries — attendance.read (Phase 4 punch calc is not claimed)</li>
            <li>GET /api/v1/leave — leave.read</li>
            <li>GET /api/v1/payroll/runs — payroll.read</li>
            <li>GET /api/v1/payslips — payslips.read (metadata only; no public PDF URL)</li>
          </ul>
          <p>Webhook headers: x-bsb-event, x-bsb-event-id, x-bsb-timestamp, x-bsb-signature (sha256=HMAC of timestamp.body). Passwords, tokens, full bank numbers and Aadhaar are stripped from payloads.</p>
        </CardContent>
      </Card>
    </div>
  );
}
