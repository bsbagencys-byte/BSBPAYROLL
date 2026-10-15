import { Badge } from "@/components/ui/badge";
import {
  CLEARANCE_TASK_STATUS_LABELS,
  EXIT_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
  type ClearanceTaskStatus,
  type ExitStatus,
  type SettlementStatus,
} from "@/lib/constants";

export function ExitStatusBadge({ status }: { status: ExitStatus }) {
  const variant =
    status === "SETTLED" || status === "APPROVED"
      ? "success"
      : status === "CANCELLED"
        ? "danger"
        : status === "DRAFT"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{EXIT_STATUS_LABELS[status]}</Badge>;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const variant =
    status === "PAID" || status === "FINALIZED" || status === "APPROVED"
      ? "success"
      : status === "CANCELLED" || status === "HAS_EXCEPTIONS"
        ? "danger"
        : status === "DRAFT"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{SETTLEMENT_STATUS_LABELS[status]}</Badge>;
}

export function ClearanceTaskBadge({ status }: { status: ClearanceTaskStatus }) {
  const variant =
    status === "CLEARED" || status === "NOT_APPLICABLE"
      ? "success"
      : status === "BLOCKED"
        ? "danger"
        : "warning";
  return <Badge variant={variant}>{CLEARANCE_TASK_STATUS_LABELS[status]}</Badge>;
}
