import {
  ANALYTICS_RULE_CODES,
  ANALYTICS_RULE_LABELS,
  DEFAULT_ANALYTICS_THRESHOLDS,
  type AnalyticsAlertSeverity,
  type AnalyticsAlertStatus,
  type AnalyticsRuleCode,
} from "@/lib/constants";
import { loadAnalyticsSnapshot, type AnalyticsSnapshot } from "@/lib/analytics/metrics";
import {
  insertAnalyticsAlert,
  insertAlertHistory,
  insertRefreshJob,
  listAnalyticsAlerts,
  listAnalyticsThresholds,
  updateAnalyticsAlert,
} from "@/lib/analytics/repository";
import { roundMoney } from "@/lib/payroll/engine";
import type { AnalyticsAlert, AnalyticsThreshold } from "@/types";

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return roundMoney(((current - previous) / Math.abs(previous)) * 100);
}

function severityFor(ratio: number): AnalyticsAlertSeverity {
  if (ratio >= 3) return "CRITICAL";
  if (ratio >= 2) return "HIGH";
  if (ratio >= 1.5) return "MEDIUM";
  return "LOW";
}

function thresholdMap(rows: AnalyticsThreshold[]) {
  const map = new Map<string, AnalyticsThreshold>();
  for (const row of rows) map.set(row.rule_code, row);
  return map;
}

function enabledValue(map: Map<string, AnalyticsThreshold>, code: AnalyticsRuleCode) {
  const row = map.get(code);
  if (row && !row.enabled) return null;
  return row?.threshold_value ?? DEFAULT_ANALYTICS_THRESHOLDS[code];
}

type Candidate = {
  rule: AnalyticsRuleCode;
  period: string;
  title: string;
  condition: string;
  actual: string;
  baseline: string | null;
  threshold: string;
  severity: AnalyticsAlertSeverity;
  explanation: string;
  recommended: string;
  employeeId?: string | null;
  runId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

function candidatesFrom(snapshot: AnalyticsSnapshot, thresholds: AnalyticsThreshold[]): Candidate[] {
  const map = thresholdMap(thresholds);
  const out: Candidate[] = [];
  const period = snapshot.period;
  const currentCost = snapshot.current.run ? snapshot.current.run.total_net + snapshot.current.run.employer_contributions : 0;
  const previousCost = snapshot.previous.run ? snapshot.previous.run.total_net + snapshot.previous.run.employer_contributions : 0;

  const costSpike = enabledValue(map, "PAYROLL_COST_SPIKE");
  if (costSpike != null && snapshot.current.run && snapshot.previous.run) {
    const change = percentChange(currentCost, previousCost);
    if (Math.abs(change) >= costSpike) {
      out.push({
        rule: "PAYROLL_COST_SPIKE",
        period,
        title: ANALYTICS_RULE_LABELS.PAYROLL_COST_SPIKE,
        condition: `Abs(current employer cost - previous) / previous >= ${costSpike}%`,
        actual: `${change}%`,
        baseline: String(roundMoney(previousCost)),
        threshold: `${costSpike}%`,
        severity: severityFor(Math.abs(change) / costSpike),
        explanation: `Payroll employer cost moved ${change}% from ${snapshot.previousLabel} to ${snapshot.periodLabel}. Totals are stored run net + employer contributions.`,
        recommended: "Open payroll variance and review employee net/gross deltas. Do not recast payroll from this alert.",
        runId: snapshot.current.run.id,
        entityType: "payroll_run",
        entityId: snapshot.current.run.id,
      });
    }
  }

  const netVar = enabledValue(map, "NET_PAY_VARIANCE");
  if (netVar != null) {
    for (const row of snapshot.variance) {
      if (row.deltaPercent == null) continue;
      if (Math.abs(row.deltaPercent) < netVar) continue;
      out.push({
        rule: "NET_PAY_VARIANCE",
        period,
        title: `${row.employeeName} net pay variance`,
        condition: `Abs(current net - previous net) / previous net >= ${netVar}%`,
        actual: `${row.deltaPercent}%`,
        baseline: String(row.previousNet ?? 0),
        threshold: `${netVar}%`,
        severity: severityFor(Math.abs(row.deltaPercent) / netVar),
        explanation: `${row.employeeName} (${row.employeeCode}) net pay moved ${row.deltaPercent}% versus the previous comparable run.`,
        recommended: "Review the employee payroll item and salary/leave/loan inputs. This alert does not change payroll.",
        employeeId: row.employeeId,
        runId: snapshot.current.run?.id ?? null,
        entityType: "payroll_item",
        entityId: row.employeeId,
      });
    }
  }

  const lopSpike = enabledValue(map, "LOP_SPIKE");
  if (lopSpike != null && snapshot.previousLop > 0) {
    const change = percentChange(snapshot.lopDays, snapshot.previousLop);
    if (change >= lopSpike) {
      out.push({
        rule: "LOP_SPIKE",
        period,
        title: ANALYTICS_RULE_LABELS.LOP_SPIKE,
        condition: `LOP days increase >= ${lopSpike}% versus previous run`,
        actual: `${change}% (${snapshot.lopDays} days)`,
        baseline: `${snapshot.previousLop} days`,
        threshold: `${lopSpike}%`,
        severity: severityFor(change / lopSpike),
        explanation: `Stored payroll item LOP days increased from ${snapshot.previousLop} to ${snapshot.lopDays}. Punch-based LOP is not calculated until Phase 4.`,
        recommended: "Review leave-written attendance days. Do not treat this as a Phase 4 punch engine result.",
        runId: snapshot.current.run?.id ?? null,
      });
    }
  }

  const hold = enabledValue(map, "HOLD_RATE_HIGH");
  if (hold != null && snapshot.holdRate >= hold && snapshot.currentItems.length) {
    out.push({
      rule: "HOLD_RATE_HIGH",
      period,
      title: ANALYTICS_RULE_LABELS.HOLD_RATE_HIGH,
      condition: `ON_HOLD items / run items >= ${hold}%`,
      actual: `${roundMoney(snapshot.holdRate)}%`,
      baseline: `${snapshot.holdCount} of ${snapshot.currentItems.length}`,
      threshold: `${hold}%`,
      severity: severityFor(snapshot.holdRate / hold),
      explanation: `${snapshot.holdCount} payroll items are on hold in the selected run.`,
      recommended: "Open payroll exceptions and hold reasons. Alerts never release holds.",
      runId: snapshot.current.run?.id ?? null,
    });
  }

  const leaveBacklog = enabledValue(map, "LEAVE_PENDING_BACKLOG");
  if (leaveBacklog != null && snapshot.pendingLeaveCount >= leaveBacklog) {
    out.push({
      rule: "LEAVE_PENDING_BACKLOG",
      period,
      title: ANALYTICS_RULE_LABELS.LEAVE_PENDING_BACKLOG,
      condition: `Pending/draft leave requests >= ${leaveBacklog}`,
      actual: String(snapshot.pendingLeaveCount),
      baseline: null,
      threshold: String(leaveBacklog),
      severity: snapshot.pendingLeaveCount >= leaveBacklog * 2 ? "HIGH" : "MEDIUM",
      explanation: `${snapshot.pendingLeaveCount} leave requests are waiting. This is a count of stored request statuses.`,
      recommended: "Review leave approvals. This alert does not approve or reject leave.",
      entityType: "leave_request",
    });
  }

  const claimBacklog = enabledValue(map, "CLAIM_PENDING_BACKLOG");
  if (claimBacklog != null && snapshot.pendingClaimCount >= claimBacklog) {
    out.push({
      rule: "CLAIM_PENDING_BACKLOG",
      period,
      title: ANALYTICS_RULE_LABELS.CLAIM_PENDING_BACKLOG,
      condition: `Submitted/pending claims >= ${claimBacklog}`,
      actual: String(snapshot.pendingClaimCount),
      baseline: null,
      threshold: String(claimBacklog),
      severity: snapshot.pendingClaimCount >= claimBacklog * 2 ? "HIGH" : "MEDIUM",
      explanation: `${snapshot.pendingClaimCount} claims are waiting for review.`,
      recommended: "Open claims approvals. This alert does not pay or include claims in payroll.",
      entityType: "claim",
    });
  }

  const overdue = enabledValue(map, "LOAN_OVERDUE");
  if (overdue != null && snapshot.overdueLoanCount >= overdue) {
    out.push({
      rule: "LOAN_OVERDUE",
      period,
      title: ANALYTICS_RULE_LABELS.LOAN_OVERDUE,
      condition: `Overdue loan installments >= ${overdue}`,
      actual: String(snapshot.overdueLoanCount),
      baseline: null,
      threshold: String(overdue),
      severity: snapshot.overdueLoanCount >= overdue * 3 ? "HIGH" : "MEDIUM",
      explanation: `${snapshot.overdueLoanCount} loan schedule rows have status OVERDUE.`,
      recommended: "Review loan accounts. This alert does not post repayments.",
      entityType: "loan_schedule",
    });
  }

  const unmapped = enabledValue(map, "BIOMETRIC_UNMAPPED");
  if (unmapped != null && snapshot.unmappedCount >= unmapped) {
    out.push({
      rule: "BIOMETRIC_UNMAPPED",
      period,
      title: ANALYTICS_RULE_LABELS.BIOMETRIC_UNMAPPED,
      condition: `Unmapped normalized punches >= ${unmapped}`,
      actual: String(snapshot.unmappedCount),
      baseline: null,
      threshold: String(unmapped),
      severity: snapshot.unmappedCount >= unmapped * 3 ? "HIGH" : "MEDIUM",
      explanation: `${snapshot.unmappedCount} punches have no employee mapping.`,
      recommended: "Map device users on the biometric identity screen. Punches are not rewritten by this alert.",
      entityType: "biometric_event",
    });
  }

  const failed = enabledValue(map, "BIOMETRIC_FAILED_INGEST");
  if (failed != null && snapshot.failedCount >= failed) {
    out.push({
      rule: "BIOMETRIC_FAILED_INGEST",
      period,
      title: ANALYTICS_RULE_LABELS.BIOMETRIC_FAILED_INGEST,
      condition: `Rejected raw events >= ${failed}`,
      actual: String(snapshot.failedCount),
      baseline: null,
      threshold: String(failed),
      severity: snapshot.failedCount >= failed * 3 ? "HIGH" : "MEDIUM",
      explanation: `${snapshot.failedCount} raw biometric payloads were rejected.`,
      recommended: "Inspect biometric logs. Do not invent device endpoints from this alert.",
      entityType: "biometric_raw_event",
    });
  }

  const headcount = enabledValue(map, "HEADCOUNT_CHANGE");
  const previousItemCount = snapshot.previousItems.length;
  if (headcount != null && previousItemCount > 0) {
    const change = percentChange(snapshot.currentItems.length, previousItemCount);
    if (Math.abs(change) >= headcount) {
      out.push({
        rule: "HEADCOUNT_CHANGE",
        period,
        title: ANALYTICS_RULE_LABELS.HEADCOUNT_CHANGE,
        condition: `Abs(current payroll items - previous items) / previous items >= ${headcount}%`,
        actual: `${change}% (${snapshot.currentItems.length} items)`,
        baseline: `${previousItemCount} items`,
        threshold: `${headcount}%`,
        severity: severityFor(Math.abs(change) / headcount),
        explanation: `Payroll item count moved ${change}% from ${previousItemCount} in ${snapshot.previousLabel} to ${snapshot.currentItems.length} in ${snapshot.periodLabel}. This is stored payroll items, not a reconstructed historical headcount.`,
        recommended: "Review joiners, exits and hold/exclude items. This alert does not change employee status.",
        runId: snapshot.current.run?.id ?? null,
        entityType: "payroll_run",
        entityId: snapshot.current.run?.id ?? null,
      });
    }
  }

  return out;
}

export async function scanAnomalies(organizationId: string, timezone: string, actorId: string | null, period?: string) {
  const snapshot = await loadAnalyticsSnapshot(organizationId, timezone, period);
  const thresholds = await listAnalyticsThresholds(organizationId);
  const found = candidatesFrom(snapshot, thresholds);
  const created: AnalyticsAlert[] = [];
  for (const item of found) {
    const key = [item.rule, item.period, item.employeeId ?? "", item.entityId ?? ""].join(":");
    const row: AnalyticsAlert = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      rule_code: item.rule,
      period: item.period,
      employee_id: item.employeeId ?? null,
      run_id: item.runId ?? null,
      entity_type: item.entityType ?? null,
      entity_id: item.entityId ?? null,
      title: item.title,
      condition_text: item.condition,
      actual_value: item.actual,
      baseline_value: item.baseline,
      threshold_value: item.threshold,
      severity: item.severity,
      explanation: item.explanation,
      recommended_action: item.recommended,
      status: "OPEN",
      assigned_to: null,
      notes: null,
      idempotency_key: key,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    created.push(await insertAnalyticsAlert(row));
  }
  await insertRefreshJob({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    job_type: "ANOMALY_SCAN",
    period: snapshot.period,
    status: "COMPLETED",
    result_json: JSON.stringify({ created: created.length, candidates: found.length }),
    error_message: null,
    created_by: actorId,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
  return { snapshot, created, candidates: found.length };
}

export async function changeAlertStatus(input: {
  organizationId: string;
  alertId: string;
  status: AnalyticsAlertStatus;
  note?: string;
  actorId: string | null;
}) {
  const alerts = await listAnalyticsAlerts(input.organizationId);
  const alert = alerts.find((row) => row.id === input.alertId);
  if (!alert) throw new Error("Alert not found.");
  const previous = alert.status;
  const updated = await updateAnalyticsAlert({ ...alert, status: input.status, notes: input.note ?? alert.notes });
  await insertAlertHistory({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    alert_id: alert.id,
    previous_status: previous,
    new_status: input.status,
    note: input.note ?? null,
    actor_id: input.actorId,
    created_at: new Date().toISOString(),
  });
  return updated;
}

export function defaultThresholdRows(organizationId: string, actorId: string | null): AnalyticsThreshold[] {
  const now = new Date().toISOString();
  return ANALYTICS_RULE_CODES.map((code) => ({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    rule_code: code,
    threshold_value: DEFAULT_ANALYTICS_THRESHOLDS[code],
    enabled: true,
    notes: null,
    created_by: actorId,
    updated_by: actorId,
    created_at: now,
    updated_at: now,
  }));
}
