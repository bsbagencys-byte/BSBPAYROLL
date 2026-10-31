import { Badge } from "@/components/ui/badge";
import {
  FEEDBACK_KIND_LABELS,
  FEEDBACK_STATUS_LABELS,
  INCIDENT_STATUS_LABELS,
  LAUNCH_DECISION_LABELS,
  MODULE_READINESS_STATUS_LABELS,
  PARALLEL_RUN_STATUS_LABELS,
  PILOT_ORG_STATUS_LABELS,
  RELEASE_BLOCKER_SEVERITY_LABELS,
  RELEASE_BLOCKER_STATUS_LABELS,
  UAT_RESULT_STATUS_LABELS,
  type FeedbackKind,
  type FeedbackStatus,
  type IncidentStatus,
  type LaunchDecision,
  type ModuleReadinessStatus,
  type ParallelRunStatus,
  type PilotOrgStatus,
  type ReleaseBlockerSeverity,
  type ReleaseBlockerStatus,
  type UatResultStatus,
} from "@/lib/constants";

function variantFor(status: string): "default" | "success" | "warning" | "danger" | "muted" {
  if (["PASS", "READY", "SIGNED_OFF", "RESOLVED", "COMPARED", "CLOSED"].includes(status)) return "success";
  if (["PARTIAL", "READY_WITH_LIMITATIONS", "IN_PILOT", "UAT", "MITIGATED", "ACCEPTED", "OPEN", "TRIAGED"].includes(status)) {
    return "warning";
  }
  if (["FAILED", "FAIL", "NOT_READY", "BLOCKED", "CRITICAL", "MISMATCHED", "WITHDRAWN"].includes(status)) return "danger";
  return "muted";
}

export function LaunchDecisionBadge({ decision }: { decision: LaunchDecision }) {
  return <Badge variant={variantFor(decision)}>{LAUNCH_DECISION_LABELS[decision]}</Badge>;
}

export function ModuleStatusBadge({ status }: { status: ModuleReadinessStatus }) {
  return <Badge variant={variantFor(status)}>{MODULE_READINESS_STATUS_LABELS[status]}</Badge>;
}

export function BlockerSeverityBadge({ severity }: { severity: ReleaseBlockerSeverity }) {
  return <Badge variant={variantFor(severity)}>{RELEASE_BLOCKER_SEVERITY_LABELS[severity]}</Badge>;
}

export function BlockerStatusBadge({ status }: { status: ReleaseBlockerStatus }) {
  return <Badge variant={variantFor(status)}>{RELEASE_BLOCKER_STATUS_LABELS[status]}</Badge>;
}

export function PilotStatusBadge({ status }: { status: PilotOrgStatus }) {
  return <Badge variant={variantFor(status)}>{PILOT_ORG_STATUS_LABELS[status]}</Badge>;
}

export function ParallelRunBadge({ status }: { status: ParallelRunStatus }) {
  return <Badge variant={variantFor(status)}>{PARALLEL_RUN_STATUS_LABELS[status]}</Badge>;
}

export function UatBadge({ status }: { status: UatResultStatus }) {
  return <Badge variant={variantFor(status)}>{UAT_RESULT_STATUS_LABELS[status]}</Badge>;
}

export function IncidentBadge({ status }: { status: IncidentStatus }) {
  return <Badge variant={variantFor(status)}>{INCIDENT_STATUS_LABELS[status]}</Badge>;
}

export function FeedbackKindBadge({ kind }: { kind: FeedbackKind }) {
  return <Badge variant={kind === "DEFECT" ? "danger" : "muted"}>{FEEDBACK_KIND_LABELS[kind]}</Badge>;
}

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  return <Badge variant={variantFor(status)}>{FEEDBACK_STATUS_LABELS[status]}</Badge>;
}
