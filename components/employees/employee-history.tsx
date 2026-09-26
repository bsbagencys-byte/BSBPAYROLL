import { EmptyState } from "@/components/layout/app-shell";
import { formatDateOnly, formatDateTime } from "@/lib/utils";
import type { EmployeeHistory } from "@/types";

const LABELS: Record<string, string> = {
  JOINING: "Joined",
  DEPARTMENT_CHANGE: "Department change",
  DESIGNATION_CHANGE: "Designation change",
  BRANCH_TRANSFER: "Branch transfer",
  MANAGER_CHANGE: "Manager change",
  EMPLOYMENT_TYPE_CHANGE: "Employment type change",
  STATUS_CHANGE: "Status change",
};

export function EmployeeHistoryList({
  history,
  timezone,
}: {
  history: EmployeeHistory[];
  timezone: string;
}) {
  if (history.length === 0) {
    return <EmptyState title="No history yet" description="Joining, transfers and status changes will be recorded here." />;
  }

  return (
    <ol className="space-y-3">
      {history.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{LABELS[item.event_type] ?? item.event_type.replaceAll("_", " ")}</p>
            <p className="text-xs text-slate-500">{formatDateTime(item.created_at, timezone)}</p>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {item.old_value ? `${item.old_value} → ${item.new_value ?? "—"}` : item.new_value ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Effective {formatDateOnly(item.effective_date)}
            {item.reason ? ` · ${item.reason}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
