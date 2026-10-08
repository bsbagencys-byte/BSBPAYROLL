import { listAttendanceDays } from "@/lib/leave/attendance";
import { listEmployment, listRequests } from "@/lib/leave/repository";
import { listPayrollItems, listPayrollLines } from "@/lib/payroll/repository";
import { getDemoStore } from "@/lib/demo-store";
import { listPayrollStatutoryResults } from "@/lib/statutory/repository";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmployeeStatutory, PayrollException, PayrollExceptionCode, PayrollItem, PayrollLine, PayrollRun } from "@/types";

async function loadEmployeeStatutory(employeeId: string): Promise<EmployeeStatutory | null> {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoStore().employeeStatutory.find((item) => item.employee_id === employeeId) ?? null;
  }
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("employee_statutory").select("*").eq("employee_id", employeeId).maybeSingle();
  return (data as EmployeeStatutory | null) ?? null;
}

function stamp() {
  return new Date().toISOString();
}

function exception(input: {
  organizationId: string;
  run: PayrollRun;
  item?: PayrollItem;
  code: PayrollExceptionCode;
  severity: "ERROR" | "WARNING";
  message: string;
  sourceType?: string | null;
  sourceId?: string | null;
}): PayrollException {
  return {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    run_id: input.run.id,
    item_id: input.item?.id ?? null,
    employee_id: input.item?.employee_id ?? null,
    code: input.code,
    severity: input.severity,
    status: "OPEN",
    message: input.message,
    source_type: input.sourceType ?? null,
    source_id: input.sourceId ?? null,
    acknowledged_by: null,
    acknowledged_at: null,
    acknowledge_note: null,
    resolved_at: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
}

export async function scanPayrollExceptions(organizationId: string, run: PayrollRun): Promise<PayrollException[]> {
  const [items, lines, employment, leaveRequests, days, statutoryResults] = await Promise.all([
    listPayrollItems(organizationId, run.id),
    listPayrollLines(organizationId, run.id),
    listEmployment(organizationId),
    listRequests(organizationId),
    listAttendanceDays(organizationId, run.period_from, run.period_to),
    listPayrollStatutoryResults(organizationId, run.id),
  ]);
  const found: PayrollException[] = [];
  const pendingLeave = leaveRequests.filter(
    (item) =>
      item.status === "PENDING" && item.from_date <= run.period_to && item.to_date >= run.period_from
  );

  for (const item of items) {
    const job = employment.find((row) => row.employee_id === item.employee_id);
    const itemLines = lines.filter((line) => line.item_id === item.id);
    if (item.status === "ERROR" || item.status === "EXCLUDED") {
      const code: PayrollExceptionCode =
        item.error_message?.toLowerCase().includes("salary") || !item.assignment_id
          ? "MISSING_SALARY_STRUCTURE"
          : item.error_message?.toLowerCase().includes("active")
            ? "INVALID_EMPLOYEE_STATE"
            : "OTHER_CALCULATION_ERROR";
      found.push(
        exception({
          organizationId,
          run,
          item,
          code,
          severity: "ERROR",
          message: item.error_message || "Employee could not be included in this run.",
          sourceType: item.assignment_id ? "salary_assignment" : "employee",
          sourceId: item.assignment_id ?? item.employee_id,
        })
      );
    }
    if (item.status === "INCLUDED" && !item.assignment_id) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "INVALID_SALARY_PERIOD",
          severity: "ERROR",
          message: "Included employee has no salary assignment reference for this period.",
          sourceType: "salary_assignment",
          sourceId: null,
        })
      );
    }
    if (item.status === "INCLUDED" && item.net_pay < 0) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "NEGATIVE_RESULT",
          severity: "ERROR",
          message: "Net pay is negative.",
        })
      );
    }
    const attendanceRows = days.filter((row) => row.employee_id === item.employee_id);
    if (item.status === "INCLUDED" && attendanceRows.length === 0) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "MISSING_ATTENDANCE",
          severity: "WARNING",
          message: "No attendance day marks for this period. Unmarked working days are treated as paid until Phase 4.",
          sourceType: "attendance_days",
        })
      );
    }
    const unresolved = attendanceRows.filter((row) => row.status === "ABSENT");
    if (unresolved.length) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "UNRESOLVED_ATTENDANCE_EXCEPTION",
          severity: "WARNING",
          message: `${unresolved.length} unmarked/absent day(s) in this period.`,
          sourceType: "attendance_days",
          sourceId: unresolved[0]?.id ?? null,
        })
      );
    }
    const employeeLeave = pendingLeave.filter((row) => row.employee_id === item.employee_id);
    if (employeeLeave.length) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "UNRESOLVED_LEAVE",
          severity: "ERROR",
          message: `${employeeLeave.length} pending leave request(s) overlap this period.`,
          sourceType: "leave_request",
          sourceId: employeeLeave[0]?.id ?? null,
        })
      );
    }
    if (job && job.joining_date && job.joining_date > run.period_to) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "INVALID_EMPLOYEE_STATE",
          severity: "ERROR",
          message: "Employee joined after this payroll period.",
          sourceType: "employment",
          sourceId: job.id,
        })
      );
    }
    const duplicate = findDuplicateSources(itemLines);
    if (duplicate) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "DUPLICATE_SOURCE",
          severity: "ERROR",
          message: duplicate,
        })
      );
    }
    const loanLines = itemLines.filter((line) => line.kind === "LOAN");
    if (loanLines.some((line) => line.amount > 0 && !line.notes)) {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "LOAN_MISMATCH",
          severity: "ERROR",
          message: "Loan EMI line is missing the loan account reference.",
          sourceType: "loan_account",
        })
      );
    }
    if (item.status === "ON_HOLD") {
      found.push(
        exception({
          organizationId,
          run,
          item,
          code: "OTHER_CALCULATION_ERROR",
          severity: "WARNING",
          message: item.hold_reason || "Employee is on hold for this run.",
        })
      );
    }
    if (item.status === "INCLUDED") {
      const statutoryFlags = await loadEmployeeStatutory(item.employee_id);
      const result = statutoryResults.find((row) => row.item_id === item.id);
      const warnings = result?.notes_json
        ? (() => {
            try {
              const parsed = JSON.parse(result.notes_json) as string[];
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [] as string[];
            }
          })()
        : [];
      if (warnings.some((text) => text.toLowerCase().includes("no active") || text.toLowerCase().includes("not calculated"))) {
        found.push(
          exception({
            organizationId,
            run,
            item,
            code: "STATUTORY_RULE_MISSING",
            severity: "WARNING",
            message: warnings.find((text) => text.toLowerCase().includes("no active") || text.toLowerCase().includes("not calculated")) || "Statutory rule missing.",
            sourceType: "statutory",
          })
        );
      }
      if (warnings.some((text) => text.toLowerCase().includes("not source-verified"))) {
        found.push(
          exception({
            organizationId,
            run,
            item,
            code: "STATUTORY_UNVERIFIED_RULE",
            severity: "WARNING",
            message: "A statutory rule used for this employee is not source-verified.",
            sourceType: "statutory",
          })
        );
      }
      if (statutoryFlags?.pf_applicable !== false && item.pf_employee > 0 && !statutoryFlags?.uan) {
        found.push(
          exception({
            organizationId,
            run,
            item,
            code: "STATUTORY_UAN_MISSING",
            severity: "WARNING",
            message: "PF is deducted but the employee has no UAN.",
            sourceType: "employee_statutory",
            sourceId: item.employee_id,
          })
        );
      }
      if (item.tds_amount > 0 && !statutoryFlags?.pan) {
        found.push(
          exception({
            organizationId,
            run,
            item,
            code: "STATUTORY_PAN_MISSING",
            severity: "WARNING",
            message: "TDS is deducted but the employee has no PAN.",
            sourceType: "employee",
            sourceId: item.employee_id,
          })
        );
      }
    }
  }

  return found;
}

function findDuplicateSources(lines: PayrollLine[]) {
  const seen = new Map<string, number>();
  for (const line of lines) {
    if (!line.reference_id) continue;
    const key = `${line.kind}:${line.reference_id}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) return `Duplicate source ${key} appears ${count} times.`;
  }
  return null;
}

export function exceptionCounts(rows: PayrollException[]) {
  const open = rows.filter((item) => item.status !== "RESOLVED");
  return {
    errorCount: open.filter((item) => item.severity === "ERROR").length,
    warningCount: open.filter((item) => item.severity === "WARNING").length,
    unackedWarnings: open.filter((item) => item.severity === "WARNING" && item.status !== "ACKNOWLEDGED").length,
  };
}
