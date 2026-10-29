import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { MigrationSubnav } from "@/components/onboarding/subnav";
import { ImportJobBadge } from "@/components/onboarding/status-badge";
import { ImportPreviewForm } from "@/components/onboarding/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { IMPORT_ENTITY_TYPE_LABELS } from "@/lib/constants";
import { IMPORT_TEMPLATES } from "@/lib/onboarding/engine";
import { listImportJobs } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Data migration" };

export default async function DataMigrationPage() {
  const user = await requirePermissionOrRedirect("migration.view");
  const jobs = await listImportJobs(user.organization.id);
  const canManage = hasPermission(user, "migration.manage");
  const latest = jobs[0];

  return (
    <div>
      <PageHeader
        title="Data migration"
        description="CSV preview then confirm. Excel is rejected. Existing employee CSV import at /employees/import is unchanged."
      />
      <SettingsSubnav pathname="/settings/data-migration" />
      <MigrationSubnav />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {Object.entries(IMPORT_TEMPLATES).slice(0, 3).map(([key, value]) => (
          <Card key={key}>
            <CardHeader><CardTitle className="text-sm">{IMPORT_ENTITY_TYPE_LABELS[key as keyof typeof IMPORT_ENTITY_TYPE_LABELS]}</CardTitle></CardHeader>
            <CardContent className="text-xs text-slate-600">{value.notes}</CardContent>
          </Card>
        ))}
      </div>
      {canManage ? <ImportPreviewForm lastJobId={latest?.id} /> : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rows</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No import jobs yet.</td></tr>
            ) : jobs.slice(0, 8).map((job) => (
              <tr key={job.id} className="border-b last:border-0">
                <td className="px-4 py-3">{job.file_name}</td>
                <td className="px-4 py-3">{IMPORT_ENTITY_TYPE_LABELS[job.entity_type]}</td>
                <td className="px-4 py-3"><ImportJobBadge status={job.status} /></td>
                <td className="px-4 py-3">{job.imported_rows}/{job.total_rows}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(job.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
