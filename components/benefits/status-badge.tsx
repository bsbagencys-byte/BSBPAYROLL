import { Badge } from "@/components/ui/badge";
import { BENEFIT_ASSIGNMENT_STATUS_LABELS, type BenefitAssignmentStatus } from "@/lib/constants";

export function BenefitAssignmentBadge({ status }: { status: BenefitAssignmentStatus }) {
  const variant = status === "ACTIVE" ? "success" : status === "DRAFT" ? "warning" : "muted";
  return <Badge variant={variant}>{BENEFIT_ASSIGNMENT_STATUS_LABELS[status]}</Badge>;
}
