import { Badge } from "@/components/ui/badge";
import { PAYROLL_JOURNAL_STATUS_LABELS, type PayrollJournalStatus } from "@/lib/constants";

export function JournalBadge({ status }: { status: PayrollJournalStatus }) {
  const variant =
    status === "EXPORTED" || status === "VALIDATED" ? "success" : status === "VOID" ? "danger" : status === "DRAFT" ? "warning" : "muted";
  return <Badge variant={variant}>{PAYROLL_JOURNAL_STATUS_LABELS[status]}</Badge>;
}
