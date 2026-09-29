import { Badge } from "@/components/ui/badge";
import {
  COMP_OFF_STATUS_LABELS,
  LEAVE_REQUEST_STATUS_LABELS,
  type CompOffStatus,
  type LeaveRequestStatus,
} from "@/lib/constants";

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  const variant =
    status === "APPROVED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "REJECTED" || status === "CANCELLED"
          ? "danger"
          : "muted";
  return <Badge variant={variant}>{LEAVE_REQUEST_STATUS_LABELS[status]}</Badge>;
}

export function CompOffBadge({ status }: { status: CompOffStatus }) {
  const variant =
    status === "APPROVED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "REJECTED" || status === "EXPIRED"
          ? "danger"
          : "muted";
  return <Badge variant={variant}>{COMP_OFF_STATUS_LABELS[status]}</Badge>;
}
