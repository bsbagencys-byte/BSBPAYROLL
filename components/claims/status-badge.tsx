import { Badge } from "@/components/ui/badge";
import { CLAIM_STATUS_LABELS, type ClaimPolicyCheckResult, type ClaimStatus } from "@/lib/constants";

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const variant =
    status === "APPROVED" || status === "PAID" || status === "INCLUDED_IN_PAYROLL"
      ? "success"
      : status === "REJECTED" || status === "CANCELLED"
        ? "danger"
        : status === "DRAFT"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{CLAIM_STATUS_LABELS[status]}</Badge>;
}

export function CheckBadge({ result }: { result: ClaimPolicyCheckResult }) {
  const variant = result === "PASS" ? "success" : result === "WARN" ? "warning" : "danger";
  return <Badge variant={variant}>{result}</Badge>;
}
