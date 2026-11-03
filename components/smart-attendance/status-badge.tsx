import { Badge } from "@/components/ui/badge";
import {
  ATTENDANCE_RISK_LEVEL_LABELS,
  SMART_EVENT_STATUS_LABELS,
  TRUSTED_DEVICE_STATUS_LABELS,
  type AttendanceRiskLevel,
  type SmartEventStatus,
  type TrustedDeviceStatus,
} from "@/lib/constants";

export function SmartEventBadge({ status }: { status: SmartEventStatus }) {
  const variant =
    status === "ACCEPTED"
      ? "success"
      : status === "REJECTED"
        ? "danger"
        : status === "PENDING_REVIEW" || status === "FLAGGED"
          ? "danger"
          : status === "PENDING_VERIFICATION" || status === "DUPLICATE"
            ? "warning"
            : "muted";
  return <Badge variant={variant}>{SMART_EVENT_STATUS_LABELS[status]}</Badge>;
}

export function RiskBadge({ risk }: { risk: AttendanceRiskLevel }) {
  const variant = risk === "HIGH" ? "danger" : risk === "MEDIUM" ? "warning" : "success";
  return <Badge variant={variant}>{ATTENDANCE_RISK_LEVEL_LABELS[risk]}</Badge>;
}

export function TrustedDeviceBadge({ status }: { status: TrustedDeviceStatus }) {
  const variant =
    status === "ACTIVE" ? "success" : status === "PENDING" || status === "REPLACEMENT_PENDING" ? "warning" : "danger";
  return <Badge variant={variant}>{TRUSTED_DEVICE_STATUS_LABELS[status]}</Badge>;
}
