import Link from "next/link";
import { EmptyState } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmployeeStatusBadge } from "@/components/employees/status-badge";
import { formatDateOnly } from "@/lib/utils";
import type { EmployeeListItem } from "@/types";

export function EmployeeTable({
  items,
  page,
  pageCount,
  total,
  query,
}: {
  items: EmployeeListItem[];
  page: number;
  pageCount: number;
  total: number;
  query: string;
}) {
  if (items.length === 0) {
    return <EmptyState title="No employees found" description="Try a different search, or add the first employee." />;
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams(query);
    params.set("page", String(nextPage));
    return `/employees?${params.toString()}`;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/employees/${item.id}`} className="font-medium text-brand-800 hover:underline">
                    {item.displayName}
                  </Link>
                  <div className="text-xs text-slate-500">{item.employeeCode}</div>
                </td>
                <td className="px-4 py-3">{item.mobile ?? "—"}</td>
                <td className="px-4 py-3">{item.departmentName ?? "—"}</td>
                <td className="px-4 py-3">{item.designationName ?? "—"}</td>
                <td className="px-4 py-3">{item.branchName ?? "—"}</td>
                <td className="px-4 py-3">{formatDateOnly(item.joiningDate)}</td>
                <td className="px-4 py-3">
                  <EmployeeStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/employees/${item.id}`}>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {pageCount} · {total} employee{total === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)}>
              <Button size="sm" variant="outline">
                Previous
              </Button>
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)}>
              <Button size="sm" variant="outline">
                Next
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
