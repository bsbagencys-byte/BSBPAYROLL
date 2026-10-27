import { Badge } from "@/components/ui/badge";
import {
  BILLING_INVOICE_STATUS_LABELS,
  BILLING_PAYMENT_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type BillingInvoiceStatus,
  type BillingPaymentStatus,
  type PlanStatus,
  type SubscriptionStatus,
} from "@/lib/constants";

function variantFor(status: string): "default" | "success" | "warning" | "danger" | "muted" {
  if (["ACTIVE", "PAID", "SUCCESS"].includes(status)) return "success";
  if (["TRIAL", "ISSUED", "PENDING", "GRACE_PERIOD", "PARTIALLY_PAID", "DRAFT"].includes(status)) return "warning";
  if (["PAST_DUE", "OVERDUE", "FAILED", "SUSPENDED", "EXPIRED", "CANCELLED", "VOID", "REFUNDED"].includes(status)) {
    return "danger";
  }
  return "muted";
}

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={variantFor(status)}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>;
}

export function InvoiceBadge({ status }: { status: BillingInvoiceStatus }) {
  return <Badge variant={variantFor(status)}>{BILLING_INVOICE_STATUS_LABELS[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: BillingPaymentStatus }) {
  return <Badge variant={variantFor(status)}>{BILLING_PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function PlanBadge({ status }: { status: PlanStatus }) {
  return <Badge variant={variantFor(status)}>{PLAN_STATUS_LABELS[status]}</Badge>;
}
