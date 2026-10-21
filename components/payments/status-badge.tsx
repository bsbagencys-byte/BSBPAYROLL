import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_BATCH_STATUS_LABELS,
  PAYMENT_ITEM_STATUS_LABELS,
  type PaymentBatchStatus,
  type PaymentItemStatus,
} from "@/lib/constants";

export function PaymentBatchBadge({ status }: { status: PaymentBatchStatus }) {
  const variant =
    status === "PAID"
      ? "success"
      : status === "APPROVED" || status === "READY"
        ? "default"
        : status === "EXPORTED" || status === "PARTIALLY_PAID" || status === "VALIDATING"
          ? "warning"
          : status === "FAILED" || status === "CANCELLED"
            ? "danger"
            : "muted";
  return <Badge variant={variant}>{PAYMENT_BATCH_STATUS_LABELS[status]}</Badge>;
}

export function PaymentItemBadge({ status }: { status: PaymentItemStatus }) {
  const variant =
    status === "SUCCESS" || status === "RECONCILED"
      ? "success"
      : status === "FAILED" || status === "REVERSED"
        ? "danger"
        : status === "EXCLUDED"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{PAYMENT_ITEM_STATUS_LABELS[status]}</Badge>;
}
