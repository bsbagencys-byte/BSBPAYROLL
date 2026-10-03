import { Badge } from "@/components/ui/badge";
import {
  LOAN_ACCOUNT_STATUS_LABELS,
  LOAN_APPLICATION_STATUS_LABELS,
  LOAN_INSTALLMENT_STATUS_LABELS,
  type LoanAccountStatus,
  type LoanApplicationStatus,
  type LoanInstallmentStatus,
} from "@/lib/constants";

export function LoanApplicationStatusBadge({ status }: { status: LoanApplicationStatus }) {
  const variant =
    status === "APPROVED" || status === "DISBURSED"
      ? "success"
      : status === "REJECTED" || status === "CANCELLED"
        ? "danger"
        : status === "DRAFT"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{LOAN_APPLICATION_STATUS_LABELS[status]}</Badge>;
}

export function LoanAccountStatusBadge({ status }: { status: LoanAccountStatus }) {
  const variant =
    status === "ACTIVE" || status === "COMPLETED"
      ? "success"
      : status === "CANCELLED" || status === "WRITTEN_OFF"
        ? "danger"
        : "warning";
  return <Badge variant={variant}>{LOAN_ACCOUNT_STATUS_LABELS[status]}</Badge>;
}

export function LoanInstallmentStatusBadge({ status }: { status: LoanInstallmentStatus }) {
  const variant =
    status === "PAID" || status === "WAIVED"
      ? "success"
      : status === "OVERDUE"
        ? "danger"
        : status === "UPCOMING"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{LOAN_INSTALLMENT_STATUS_LABELS[status]}</Badge>;
}
