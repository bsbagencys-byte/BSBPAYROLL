"use client";

import Link from "next/link";
import { LeaveStatusBadge } from "@/components/leave/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/utils";
import type { LeaveBalanceView, LeaveRequest } from "@/types";

export function EmployeeLeavePanel({
  balances,
  requests,
}: {
  balances: LeaveBalanceView[];
  requests: LeaveRequest[];
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Leave balances</CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-sm text-slate-500">No leave balances yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Allocated</th>
                    <th className="px-3 py-2">Used</th>
                    <th className="px-3 py-2">Pending</th>
                    <th className="px-3 py-2">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((row) => (
                    <tr key={`${row.leaveTypeId}-${row.year}`} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {row.leaveTypeName}
                        <div className="text-xs text-slate-500">{row.leaveTypeCode}</div>
                      </td>
                      <td className="px-3 py-2">{row.allocated}</td>
                      <td className="px-3 py-2">{row.used}</td>
                      <td className="px-3 py-2">{row.pending}</td>
                      <td className="px-3 py-2 font-medium">{row.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Requests</CardTitle>
          <Link href="/leave/requests" className="text-sm text-brand-700 hover:underline">
            Open leave
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">No leave requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">
                      {formatDateOnly(row.from_date)}
                      {row.from_date !== row.to_date ? ` – ${formatDateOnly(row.to_date)}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">{row.days} day(s) · {row.reason || "No reason"}</p>
                  </div>
                  <LeaveStatusBadge status={row.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
