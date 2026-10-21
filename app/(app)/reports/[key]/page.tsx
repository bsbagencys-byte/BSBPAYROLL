import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { ReportsSubnav } from "@/components/reports/subnav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { reportByKey } from "@/lib/reports/catalog";
import { runReport, type ReportFilters } from "@/lib/reports/query";
import { EMPLOYEE_STATUS_LABELS } from "@/lib/constants";

export const metadata = { title: "Report" };

function first(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("reports.view");
  const { key } = await params;
  const def = reportByKey(decodeURIComponent(key));
  if (!def) notFound();
  if (!hasPermission(user, def.permission) && !hasPermission(user, "reports.view")) notFound();
  const query = await searchParams;
  const filters: ReportFilters = {
    period: first(query, "period"),
    from: first(query, "from"),
    to: first(query, "to"),
    branchId: first(query, "branchId"),
    departmentId: first(query, "departmentId"),
    employeeId: first(query, "employeeId"),
    status: first(query, "status"),
  };
  const [table, catalog] = await Promise.all([
    runReport(user.organization.id, def.key, filters, user.organization.timezone),
    loadOrgCatalog(user.organization.id),
  ]);
  const canExport = hasPermission(user, "reports.export");
  const qs = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value) qs.set(name, value);
  }
  const csvHref = `/api/reports/${encodeURIComponent(def.key)}${qs.toString() ? `?${qs}` : ""}`;

  return (
    <div>
      <PageHeader
        title={def.title}
        description={def.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <a href={csvHref}>
                <Button variant="outline">Download CSV</Button>
              </a>
            ) : null}
            <Link href="/reports">
              <Button variant="outline">All reports</Button>
            </Link>
          </div>
        }
      />
      <Suspense>
        <ReportsSubnav />
      </Suspense>
      {def.filters.length ? (
        <Card className="mb-4 print:hidden">
          <CardContent className="pt-6">
            <form className="grid gap-3 md:grid-cols-4">
              {def.filters.includes("period") ? (
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Input id="period" name="period" className="mt-1" defaultValue={filters.period ?? ""} placeholder="YYYY-MM" />
                </div>
              ) : null}
              {def.filters.includes("from") ? (
                <div>
                  <Label htmlFor="from">From</Label>
                  <Input id="from" name="from" type="date" className="mt-1" defaultValue={filters.from ?? ""} />
                </div>
              ) : null}
              {def.filters.includes("to") ? (
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input id="to" name="to" type="date" className="mt-1" defaultValue={filters.to ?? ""} />
                </div>
              ) : null}
              {def.filters.includes("branch") ? (
                <div>
                  <Label htmlFor="branchId">Branch</Label>
                  <Select id="branchId" name="branchId" className="mt-1" defaultValue={filters.branchId ?? ""}>
                    <option value="">All</option>
                    {catalog.branches.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              {def.filters.includes("department") ? (
                <div>
                  <Label htmlFor="departmentId">Department</Label>
                  <Select id="departmentId" name="departmentId" className="mt-1" defaultValue={filters.departmentId ?? ""}>
                    <option value="">All</option>
                    {catalog.departments.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              {def.filters.includes("employee") ? (
                <div>
                  <Label htmlFor="employeeId">Employee</Label>
                  <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={filters.employeeId ?? ""}>
                    <option value="">All</option>
                    {catalog.employees.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.employee_code} · {row.display_name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              {def.filters.includes("status") ? (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" className="mt-1" defaultValue={filters.status ?? ""}>
                    <option value="">All</option>
                    {Object.entries(EMPLOYEE_STATUS_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div className="flex items-end">
                <Button type="submit">Apply</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {table.note ? <p className="mb-3 text-sm text-amber-800">{table.note}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {table.headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={table.headers.length}>
                  No rows for the selected filters.
                </td>
              </tr>
            ) : (
              table.rows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className="px-4 py-3">
                      {cell === null || cell === undefined ? "—" : String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
