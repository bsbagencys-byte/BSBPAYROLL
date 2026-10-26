import type { PayrollRunStatus } from "@/lib/constants";

export const IMMUTABLE_PAYROLL_STATUSES: PayrollRunStatus[] = [
  "FINALIZED",
  "LOCKED",
  "PROCESSED",
  "PAID",
  "CANCELLED",
];

export function isPayrollImmutable(status: PayrollRunStatus) {
  return IMMUTABLE_PAYROLL_STATUSES.includes(status);
}

export function canRecalculate(status: PayrollRunStatus) {
  return status === "DRAFT" || status === "CALCULATED";
}

export function canHoldOrInclude(status: PayrollRunStatus) {
  return status === "DRAFT" || status === "CALCULATED" || status === "UNDER_REVIEW";
}

export function canSubmitReview(status: PayrollRunStatus) {
  return status === "CALCULATED";
}

export function canApprove(status: PayrollRunStatus) {
  return status === "UNDER_REVIEW" || status === "APPROVAL_PENDING";
}

export function canReject(status: PayrollRunStatus) {
  return status === "UNDER_REVIEW" || status === "APPROVAL_PENDING";
}

export function canReturnDraft(status: PayrollRunStatus) {
  return status === "CALCULATED" || status === "UNDER_REVIEW" || status === "APPROVAL_PENDING" || status === "APPROVED";
}

export function canFinalize(status: PayrollRunStatus) {
  return status === "APPROVED";
}

export function canLockRun(status: PayrollRunStatus) {
  return status === "CALCULATED" || status === "FINALIZED";
}

export function canUnlockRun(status: PayrollRunStatus) {
  return status === "LOCKED";
}

export function canCancelRun(status: PayrollRunStatus) {
  return status === "DRAFT" || status === "CALCULATED" || status === "UNDER_REVIEW" || status === "APPROVAL_PENDING" || status === "APPROVED";
}

export function nextApproveStatus(status: PayrollRunStatus): PayrollRunStatus {
  if (status === "UNDER_REVIEW") return "APPROVAL_PENDING";
  if (status === "APPROVAL_PENDING") return "APPROVED";
  throw new Error("This run is not waiting for approval.");
}

export function assertMutable(status: PayrollRunStatus, message = "Finalized payroll cannot be changed. Create an adjustment or reversal run.") {
  if (isPayrollImmutable(status)) throw new Error(message);
}
