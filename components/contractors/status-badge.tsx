import { Badge } from "@/components/ui/badge";
import {
  CONTRACTOR_INVOICE_STATUS_LABELS,
  CONTRACTOR_STATUS_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  type ContractorInvoiceStatus,
  type ContractorStatus,
  type EngagementStatus,
} from "@/lib/constants";

export function ContractorStatusBadge({ status }: { status: ContractorStatus }) {
  const variant = status === "ACTIVE" ? "success" : status === "BLACKLISTED" ? "danger" : "muted";
  return <Badge variant={variant}>{CONTRACTOR_STATUS_LABELS[status]}</Badge>;
}

export function EngagementStatusBadge({ status }: { status: EngagementStatus }) {
  const variant =
    status === "ACTIVE"
      ? "success"
      : status === "EXPIRED" || status === "CANCELLED"
        ? "danger"
        : "warning";
  return <Badge variant={variant}>{ENGAGEMENT_STATUS_LABELS[status]}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: ContractorInvoiceStatus }) {
  const variant =
    status === "PAID" || status === "APPROVED"
      ? "success"
      : status === "REJECTED" || status === "CANCELLED"
        ? "danger"
        : status === "DRAFT"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{CONTRACTOR_INVOICE_STATUS_LABELS[status]}</Badge>;
}
