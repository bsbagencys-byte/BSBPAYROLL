import { Badge } from "@/components/ui/badge";
import {
  COMPLIANCE_FILING_STATUS_LABELS,
  PAYROLL_ITEM_STATUS_LABELS,
  PAYROLL_RUN_STATUS_LABELS,
  PAYSLIP_STATUS_LABELS,
  type ComplianceFilingStatus,
  type PayrollItemStatus,
  type PayrollRunStatus,
  type PayslipStatus,
} from "@/lib/constants";

export function PayrollRunBadge({ status }: { status: PayrollRunStatus }) {
  const variant =
    status === "PAID" || status === "PROCESSED" || status === "FINALIZED" || status === "APPROVED"
      ? "success"
      : status === "LOCKED" || status === "APPROVAL_PENDING"
        ? "default"
        : status === "CALCULATED" || status === "UNDER_REVIEW"
          ? "warning"
          : status === "CANCELLED"
            ? "danger"
            : "muted";
  return <Badge variant={variant}>{PAYROLL_RUN_STATUS_LABELS[status]}</Badge>;
}

export function PayrollItemBadge({ status }: { status: PayrollItemStatus }) {
  const variant =
    status === "INCLUDED" ? "success" : status === "ON_HOLD" ? "warning" : status === "ERROR" ? "danger" : "muted";
  return <Badge variant={variant}>{PAYROLL_ITEM_STATUS_LABELS[status]}</Badge>;
}

export function PayslipBadge({ status }: { status: PayslipStatus }) {
  const variant = status === "ISSUED" ? "success" : status === "VOID" ? "danger" : "muted";
  return <Badge variant={variant}>{PAYSLIP_STATUS_LABELS[status]}</Badge>;
}

export function ComplianceFilingBadge({ status }: { status: ComplianceFilingStatus }) {
  const variant = status === "EXPORTED" ? "success" : status === "READY" ? "warning" : "muted";
  return <Badge variant={variant}>{COMPLIANCE_FILING_STATUS_LABELS[status]}</Badge>;
}
