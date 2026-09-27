import { Badge } from "@/components/ui/badge";
import {
  DEVICE_STATUS_LABELS,
  type BiometricEventStatus,
  type DeviceStatus,
  type PunchDirection,
} from "@/lib/constants";

const DEVICE_VARIANTS: Record<DeviceStatus, "success" | "danger" | "warning" | "muted"> = {
  ACTIVE: "success",
  PENDING: "warning",
  DISABLED: "muted",
  OFFLINE: "danger",
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  return <Badge variant={DEVICE_VARIANTS[status]}>{DEVICE_STATUS_LABELS[status]}</Badge>;
}

export function PunchDirectionBadge({ direction }: { direction: PunchDirection }) {
  const variant = direction === "IN" ? "success" : direction === "OUT" ? "warning" : "muted";
  return <Badge variant={variant}>{direction}</Badge>;
}

export function EventStatusBadge({ status }: { status: BiometricEventStatus }) {
  const variant =
    status === "MAPPED"
      ? "success"
      : status === "UNMAPPED" || status === "DUPLICATE"
        ? "warning"
        : status === "REJECTED"
          ? "danger"
          : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
