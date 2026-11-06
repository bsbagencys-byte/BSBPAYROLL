import { Badge } from "@/components/ui/badge";
import {
  ATTENDANCE_DAY_STATUS_LABELS,
  ATTENDANCE_EXCEPTION_CODE_LABELS,
  ATTENDANCE_EXCEPTION_STATUS_LABELS,
  ATTENDANCE_REGULARIZATION_STATUS_LABELS,
  type AttendanceDayStatus,
  type AttendanceExceptionCode,
  type AttendanceExceptionStatus,
  type AttendanceRegularizationStatus,
} from "@/lib/constants";

export function AttendanceDayBadge({ status }: { status: AttendanceDayStatus }) {
  const variant =
    status === "PRESENT"
      ? "success"
      : status === "ABSENT" || status === "UNPAID_LEAVE"
        ? "danger"
        : status === "WEEKLY_OFF" || status === "HOLIDAY"
          ? "muted"
          : "warning";
  return <Badge variant={variant}>{ATTENDANCE_DAY_STATUS_LABELS[status]}</Badge>;
}

export function ExceptionBadge({ status }: { status: AttendanceExceptionStatus }) {
  const variant = status === "OPEN" ? "warning" : status === "RESOLVED" ? "success" : "muted";
  return <Badge variant={variant}>{ATTENDANCE_EXCEPTION_STATUS_LABELS[status]}</Badge>;
}

export function ExceptionCodeBadge({ code }: { code: AttendanceExceptionCode }) {
  return <Badge variant="muted">{ATTENDANCE_EXCEPTION_CODE_LABELS[code]}</Badge>;
}

export function RegularizationBadge({ status }: { status: AttendanceRegularizationStatus }) {
  const variant =
    status === "APPROVED" ? "success" : status === "PENDING" ? "warning" : status === "REJECTED" ? "danger" : "muted";
  return <Badge variant={variant}>{ATTENDANCE_REGULARIZATION_STATUS_LABELS[status]}</Badge>;
}
