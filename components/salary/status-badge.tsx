import { Badge } from "@/components/ui/badge";
import {
  COMPENSATION_ENTRY_STATUS_LABELS,
  SALARY_REVISION_STATUS_LABELS,
  type CompensationEntryStatus,
  type SalaryRevisionStatus,
} from "@/lib/constants";

export function SalaryRevisionBadge({ status }: { status: SalaryRevisionStatus }) {
  const variant =
    status === "APPLIED" || status === "APPROVED"
      ? "success"
      : status === "PENDING" || status === "DRAFT"
        ? "warning"
        : "danger";
  return <Badge variant={variant}>{SALARY_REVISION_STATUS_LABELS[status]}</Badge>;
}

export function CompensationStatusBadge({ status }: { status: CompensationEntryStatus }) {
  const variant =
    status === "APPROVED" ? "success" : status === "PENDING" || status === "DRAFT" ? "warning" : "danger";
  return <Badge variant={variant}>{COMPENSATION_ENTRY_STATUS_LABELS[status]}</Badge>;
}
