import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { DataExportSubnav } from "@/components/onboarding/subnav";
import { DataExportBadge } from "@/components/onboarding/status-badge";
import { DataExportForm, DownloadExportButton } from "@/components/onboarding/forms";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { DATA_EXPORT_KIND_LABELS } from "@/lib/constants";
import { listDataExportJobs } from "@/lib/onboarding/service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Data export" };

export default async function DataExportPage() {
  const user = await requirePermissionOrRedirect("data.export");
  const jobs = await listDataExportJobs(user.organization.id);

  return (
    <div>
      <PageHeader
        title="Data export"
        description="Organization CSV export. Secrets, full bank numbers and Aadhaar are excluded. Expired files do not delete tenant data."
      />
      <SettingsSubnav pathname="/settings/data-export" />
      <DataExportSubnav />
      <DataExportForm />
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No exports yet.</td></tr>
            ) : jobs.map((job) => (
              <tr key={job.id} className="border-b last:border-0">
                <td className="px-4 py-3">{DATA_EXPORT_KIND_LABELS[job.kind]}</td>
                <td className="px-4 py-3"><DataExportBadge status={job.status} /></td>
                <td className="px-4 py-3 text-slate-500">{job.expires_at ? formatDateTime(job.expires_at) : "—"}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(job.created_at)}</td>
                <td className="px-4 py-3">
                  {job.status === "READY" ? <DownloadExportButton jobId={job.id} fileName={job.file_name || "export.csv"} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
