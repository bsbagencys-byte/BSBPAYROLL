import { loadAnalyticsSnapshot } from "@/lib/analytics/metrics";
import { listAnalyticsAlerts } from "@/lib/analytics/repository";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsSnapshot } from "@/lib/analytics/metrics";

export const ANALYTICS_TOOL_NAMES = [
  "payroll_cost_summary",
  "headcount_summary",
  "leave_backlog",
  "claim_backlog",
  "loan_outstanding",
  "biometric_health",
  "payroll_variance",
  "open_alerts",
] as const;

export type AnalyticsToolName = (typeof ANALYTICS_TOOL_NAMES)[number];

export type ToolResult = { name: AnalyticsToolName; text: string };

function costOf(snapshot: AnalyticsSnapshot) {
  if (!snapshot.current.run) return 0;
  return snapshot.current.run.total_net + snapshot.current.run.employer_contributions;
}

export async function runAnalyticsTools(organizationId: string, timezone: string, period: string | undefined, names: AnalyticsToolName[]) {
  const snapshot = await loadAnalyticsSnapshot(organizationId, timezone, period);
  const results: ToolResult[] = [];
  for (const name of names) {
    if (name === "payroll_cost_summary") {
      const run = snapshot.current.run;
      results.push({
        name,
        text: run
          ? `Period ${snapshot.periodLabel}. Status ${run.status}${snapshot.current.draft ? " (draft/in-progress, not historical)" : " (historical)"}. Net ${formatCurrency(run.total_net)}. Employer contributions ${formatCurrency(run.employer_contributions)}. Combined cost ${formatCurrency(costOf(snapshot))}. Source: stored payroll run totals.`
          : `No payroll run for ${snapshot.periodLabel}.`,
      });
    } else if (name === "headcount_summary") {
      results.push({
        name,
        text: `Active/on-notice headcount is ${snapshot.activeHeadcount} from the employee master.`,
      });
    } else if (name === "leave_backlog") {
      results.push({
        name,
        text: `${snapshot.pendingLeaveCount} leave requests are PENDING or DRAFT.`,
      });
    } else if (name === "claim_backlog") {
      results.push({
        name,
        text: `${snapshot.pendingClaimCount} claims are SUBMITTED or PENDING_APPROVAL.`,
      });
    } else if (name === "loan_outstanding") {
      const kpi = snapshot.kpis.find((item) => item.key === "loan_outstanding");
      results.push({
        name,
        text: `Loan outstanding ${kpi?.display ?? "—"}. Overdue installments: ${snapshot.overdueLoanCount}.`,
      });
    } else if (name === "biometric_health") {
      results.push({
        name,
        text: `Unmapped punches: ${snapshot.unmappedCount}. Failed ingest: ${snapshot.failedCount}. Punch-based late/OT/LOP is not calculated until Phase 4.`,
      });
    } else if (name === "payroll_variance") {
      const movers = snapshot.variance
        .filter((row) => row.deltaPercent != null)
        .sort((a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0))
        .slice(0, 5);
      results.push({
        name,
        text: movers.length
          ? `Top net-pay movers versus ${snapshot.previousLabel}: ${movers
              .map((row) => `${row.employeeName} ${row.deltaPercent}%`)
              .join("; ")}. ${snapshot.current.draft ? "Current run is not finalized." : "Current run is historical."}`
          : `No comparable previous items for ${snapshot.periodLabel}.`,
      });
    } else if (name === "open_alerts") {
      const alerts = await listAnalyticsAlerts(organizationId);
      const open = alerts.filter((row) => row.status === "OPEN" || row.status === "ACKNOWLEDGED" || row.status === "INVESTIGATING");
      results.push({
        name,
        text: open.length
          ? `${open.length} open analytics alerts: ${open
              .slice(0, 8)
              .map((row) => `${row.title} (${row.severity})`)
              .join("; ")}.`
          : "No open analytics alerts.",
      });
    }
  }
  return { snapshot, results };
}

export function toolsForQuestion(question: string): AnalyticsToolName[] {
  const text = question.toLowerCase();
  const selected = new Set<AnalyticsToolName>();
  if (/cost|payroll|net|gross|employer|salary/.test(text)) {
    selected.add("payroll_cost_summary");
    selected.add("payroll_variance");
  }
  if (/headcount|employee|staff|join/.test(text)) selected.add("headcount_summary");
  if (/leave|absent|lop/.test(text)) selected.add("leave_backlog");
  if (/claim|reimburse/.test(text)) selected.add("claim_backlog");
  if (/loan|emi|advance/.test(text)) selected.add("loan_outstanding");
  if (/biometric|punch|device|unmapped/.test(text)) selected.add("biometric_health");
  if (/alert|anomal|spike|variance/.test(text)) selected.add("open_alerts");
  if (!selected.size) {
    selected.add("payroll_cost_summary");
    selected.add("headcount_summary");
    selected.add("open_alerts");
  }
  return [...selected];
}
