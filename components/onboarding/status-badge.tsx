import { Badge } from "@/components/ui/badge";
import {
  DATA_EXPORT_STATUS_LABELS,
  IMPORT_JOB_STATUS_LABELS,
  OFFBOARDING_STATUS_LABELS,
  ONBOARDING_STEP_STATUS_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  type DataExportStatus,
  type ImportJobStatus,
  type OffboardingStatus,
  type OnboardingStepStatus,
  type SupportTicketStatus,
} from "@/lib/constants";

function variantFor(status: string): "default" | "success" | "warning" | "danger" | "muted" {
  if (["COMPLETE", "IMPORTED", "READY", "RESOLVED", "COMPLETED"].includes(status)) return "success";
  if (["IN_PROGRESS", "PREVIEWED", "PROCESSING", "OPEN", "WAITING_CUSTOMER", "WARNING", "PARTIAL", "EXPORT_READY"].includes(status)) {
    return "warning";
  }
  if (["BLOCKED", "FAILED", "EXPIRED", "CLOSED", "CANCELLED", "ERROR"].includes(status)) return "danger";
  return "muted";
}

export function OnboardingStepBadge({ status }: { status: OnboardingStepStatus }) {
  return <Badge variant={variantFor(status)}>{ONBOARDING_STEP_STATUS_LABELS[status]}</Badge>;
}

export function ImportJobBadge({ status }: { status: ImportJobStatus }) {
  return <Badge variant={variantFor(status)}>{IMPORT_JOB_STATUS_LABELS[status]}</Badge>;
}

export function SupportTicketBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge variant={variantFor(status)}>{SUPPORT_TICKET_STATUS_LABELS[status]}</Badge>;
}

export function DataExportBadge({ status }: { status: DataExportStatus }) {
  return <Badge variant={variantFor(status)}>{DATA_EXPORT_STATUS_LABELS[status]}</Badge>;
}

export function OffboardingBadge({ status }: { status: OffboardingStatus }) {
  return <Badge variant={variantFor(status)}>{OFFBOARDING_STATUS_LABELS[status]}</Badge>;
}
