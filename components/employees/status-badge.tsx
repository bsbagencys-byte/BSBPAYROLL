import { Badge } from "@/components/ui/badge";
import { EMPLOYEE_STATUS_LABELS, type EmployeeStatus } from "@/lib/constants";

const VARIANTS: Record<EmployeeStatus, "success" | "danger" | "warning" | "muted"> = {
  ACTIVE: "success",
  INACTIVE: "muted",
  ON_NOTICE: "warning",
  TERMINATED: "danger",
  RESIGNED: "muted",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge variant={VARIANTS[status]}>{EMPLOYEE_STATUS_LABELS[status]}</Badge>;
}
