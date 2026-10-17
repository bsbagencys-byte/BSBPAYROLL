import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

const SUCCESS = new Set(["APPROVED", "PAID", "ISSUED", "ACTIVE", "DISBURSED", "SETTLED", "PROCESSED", "FINALIZED"]);
const DANGER = new Set(["REJECTED", "CANCELLED", "VOID", "WRITTEN_OFF", "OVERDUE", "BLOCKED"]);
const WARNING = new Set([
  "PENDING",
  "PENDING_APPROVAL",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "PARTIALLY_PAID",
  "DUE",
  "CALCULATED",
]);
const MUTED = new Set(["DRAFT", "WITHDRAWN", "NOT_APPLICABLE", "UPCOMING", "WAIVED", "DEFERRED"]);

export function statusVariant(status: string): BadgeVariant {
  if (SUCCESS.has(status)) return "success";
  if (DANGER.has(status)) return "danger";
  if (WARNING.has(status)) return "warning";
  if (MUTED.has(status)) return "muted";
  return "default";
}

export function EssStatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={statusVariant(status)}>{label ?? status.replaceAll("_", " ").toLowerCase()}</Badge>;
}
