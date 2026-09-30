"use client";

import Link from "next/link";
import { SalaryRevisionBadge } from "@/components/salary/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { EmployeeSalarySnapshot, SalaryHistory, SalaryRevision } from "@/types";

export function EmployeeSalaryPanel({
  snapshot,
  history,
  revisions,
  canManage,
  canRevise,
  employeeId,
}: {
  snapshot: EmployeeSalarySnapshot | null;
  history: SalaryHistory[];
  revisions: SalaryRevision[];
  canManage: boolean;
  canRevise: boolean;
  employeeId: string;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Compensation summary</CardTitle>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Link href={`/salary/employee?employeeId=${employeeId}`}>
                <Button size="sm">Edit compensation</Button>
              </Link>
            ) : null}
            {canRevise ? (
              <Link href="/salary/revisions">
                <Button size="sm" variant="outline">Request revision</Button>
              </Link>
            ) : null}
            <Link href="/salary/history">
              <Button size="sm" variant="ghost">View history</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!snapshot ? (
            <p className="text-sm text-slate-500">No active salary assignment.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <Metric label="CTC" value={formatCurrency(snapshot.ctc)} />
              <Metric label="Gross" value={formatCurrency(snapshot.gross)} />
              <Metric label="Fixed earnings" value={formatCurrency(snapshot.fixedEarnings)} />
              <Metric label="Variable" value={formatCurrency(snapshot.variableEarnings)} />
              <Metric label="Reimbursements" value={formatCurrency(snapshot.reimbursements)} />
              <Metric label="Structure" value={`${snapshot.structureName} from ${formatDateOnly(snapshot.effectiveFrom)}`} />
            </div>
          )}
        </CardContent>
      </Card>
      {snapshot ? (
        <Card>
          <CardHeader>
            <CardTitle>CTC breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Component</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.lines.map((line) => (
                    <tr key={line.componentId} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {line.name}
                        <div className="text-xs text-slate-500">{line.code}</div>
                      </td>
                      <td className="px-3 py-2">{line.componentType}</td>
                      <td className="px-3 py-2">{line.calculationMethod}</td>
                      <td className="px-3 py-2">{formatCurrency(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No history yet.</p>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">{row.change_type}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateOnly(row.effective_from)} · {row.old_value ?? "—"} to {row.new_value ?? "—"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{row.reason}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {revisions.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Revisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {revisions.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{formatCurrency(row.new_ctc)}</p>
                  <p className="text-xs text-slate-500">{formatDateOnly(row.effective_from)}</p>
                </div>
                <SalaryRevisionBadge status={row.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
