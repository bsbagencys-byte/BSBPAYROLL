import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { MigrationSubnav } from "@/components/onboarding/subnav";
import { ImportJobBadge } from "@/components/onboarding/status-badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { IMPORT_ENTITY_TYPE_LABELS } from "@/lib/constants";
import { listImportJobs } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Import history" };

export default async function ImportHistoryPage() {
  const user = await requirePermissionOrRedirect("migration.view");
  const jobs = await listImportJobs(user.organization.id);

  return (
    <div>
      <PageHeader title="Import history" description="Confirmed writes only after preview. Partial jobs keep error rows for review." />
      <SettingsSubnav pathname="/settings/data-migration" />
      <MigrationSubnav />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Imported</th>
              <th className="px-4 py-3">Skipped</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No history.</td></tr>
            ) : jobs.map((job) => (
              <tr key={job.id} className="border-b last:border-0">
                <td className="px-4 py-3">{job.file_name}</td>
                <td className="px-4 py-3">{IMPORT_ENTITY_TYPE_LABELS[job.entity_type]}</td>
                <td className="px-4 py-3"><ImportJobBadge status={job.status} /></td>
                <td className="px-4 py-3">{job.imported_rows}</td>
                <td className="px-4 py-3">{job.skipped_rows}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(job.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
