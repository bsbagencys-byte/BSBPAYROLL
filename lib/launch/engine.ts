import {
  RELEASE_GATE_KEYS,
  RELEASE_GATE_LABELS,
  type BiometricTestMethod,
  type FeedbackKind,
  type LaunchDecision,
  type ModuleReadinessStatus,
  type ParallelRunStatus,
  type PilotOrgStatus,
  type ReleaseBlockerSeverity,
  type ReleaseBlockerStatus,
  type ReleaseGateKey,
  type UatResultStatus,
} from "@/lib/constants";
import type { ReleaseGateRecord } from "@/types";

export const MODULE_CATALOG: Array<{ key: string; label: string; sort_order: number }> = [
  { key: "AUTH", label: "Authentication and organization management", sort_order: 1 },
  { key: "EMPLOYEES", label: "Employees and documents", sort_order: 2 },
  { key: "BIOMETRIC", label: "Universal biometric gateway", sort_order: 3 },
  { key: "ATTENDANCE", label: "Attendance and leave", sort_order: 4 },
  { key: "SALARY", label: "Salary and compensation", sort_order: 5 },
  { key: "BENEFITS", label: "Benefits, claims and loans", sort_order: 6 },
  { key: "PAYROLL", label: "Payroll and payslips", sort_order: 7 },
  { key: "STATUTORY", label: "Statutory compliance", sort_order: 8 },
  { key: "ESS", label: "Employee self-service", sort_order: 9 },
  { key: "REPORTS", label: "Reports and accounting", sort_order: 10 },
  { key: "PAYMENTS", label: "Payment reconciliation", sort_order: 11 },
  { key: "AUTOMATION", label: "Notifications and APIs", sort_order: 12 },
  { key: "BILLING", label: "Subscriptions and onboarding", sort_order: 13 },
  { key: "SUPPORT", label: "Support and data exports", sort_order: 14 },
];

export const PILOT_CHECKLIST_STEPS: Array<{ key: string; label: string; required: boolean }> = [
  { key: "COMPANY", label: "Company profile and legal identity", required: true },
  { key: "BRANCHES", label: "Branches, departments and locations", required: true },
  { key: "ROLES", label: "Users and role assignments", required: true },
  { key: "EMPLOYEES", label: "Employee master for this organization only", required: true },
  { key: "SHIFTS", label: "Shifts and attendance rules", required: false },
  { key: "SALARY", label: "Salary structures and assignments", required: true },
  { key: "LEAVE", label: "Leave types, policies and holidays", required: true },
  { key: "STATUTORY", label: "Statutory configuration with source citation", required: true },
  { key: "BIOMETRIC", label: "Device registration and employee mapping", required: false },
  { key: "PAYROLL_SAMPLE", label: "Non-final parallel payroll comparison", required: true },
];

export const UAT_JOURNEYS: Array<{ role: "ADMIN" | "HR" | "PAYROLL" | "EMPLOYEE" | "ACCOUNTANT"; journey: string }> = [
  { role: "ADMIN", journey: "Company setup, employees, branches, roles and reports" },
  { role: "HR", journey: "Attendance, shifts, leave, corrections and approvals" },
  { role: "PAYROLL", journey: "Salary structures, payroll runs, deductions, approvals and payslips" },
  { role: "EMPLOYEE", journey: "Login, attendance, leave requests, claims and payslip access" },
  { role: "ACCOUNTANT", journey: "Payroll register, accounting export, payment batch and reconciliation" },
];

export const CRITICAL_GATES: ReleaseGateKey[] = [
  "SECURITY",
  "TENANCY",
  "PAYROLL_RECONCILE",
  "STATUTORY",
  "BIOMETRIC_HARDWARE",
  "PAYROLL_LOCK",
  "BACKUP_RESTORE",
  "ROLLBACK_DOCS",
  "UAT",
  "PILOT_SIGNOFF",
];

export type LaunchFacts = {
  modules: Array<{ key: string; status: ModuleReadinessStatus }>;
  blockers: Array<{ severity: ReleaseBlockerSeverity; status: ReleaseBlockerStatus }>;
  gates: Array<{ gate_key: ReleaseGateKey; passing: boolean }>;
  pilots: Array<{ status: PilotOrgStatus }>;
  biometric: Array<{ method: BiometricTestMethod; advertised: boolean; result: ModuleReadinessStatus }>;
  parallelRuns: Array<{ status: ParallelRunStatus; mismatch_count: number; finalized: boolean }>;
  uat: Array<{ status: UatResultStatus }>;
  openCriticalIncidents: number;
};

export function sanitizeIncidentText(value: string) {
  return value
    .replace(/\b(?:password|secret|token|service[_-]?role|apikey|api[_-]?key)\b[=:]\s*\S+/gi, "[redacted]")
    .replace(/\b\d{9,18}\b/g, "[redacted-number]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[redacted-pan]")
    .trim();
}

export function incidentNumber(sequence: number) {
  return `INC-${String(sequence).padStart(5, "0")}`;
}

export function classifyFeedback(kind: FeedbackKind, severity: ReleaseBlockerSeverity) {
  if (kind === "FEATURE_REQUEST") return "backlog";
  if (severity === "CRITICAL" || severity === "HIGH") return "defect-priority";
  return "defect";
}

export function advertisedHardwareClaimed(rows: LaunchFacts["biometric"]) {
  return rows.some(
    (row) =>
      row.advertised &&
      row.method !== "PHYSICAL_DEVICE_VERIFIED" &&
      row.result !== "PASS"
  );
}

export function parallelRunSafe(rows: LaunchFacts["parallelRuns"]) {
  return !rows.some((row) => row.finalized);
}

export function allRequiredUatPassed(rows: LaunchFacts["uat"]) {
  if (rows.length === 0) return false;
  return rows.every((row) => row.status === "PASS");
}

export function anyPilotSignedOff(rows: LaunchFacts["pilots"]) {
  return rows.some((row) => row.status === "SIGNED_OFF");
}

export function openCriticalBlockers(rows: LaunchFacts["blockers"]) {
  return rows.filter((row) => row.severity === "CRITICAL" && (row.status === "OPEN" || row.status === "MITIGATED"));
}

export function gatePassingMap(gates: LaunchFacts["gates"]) {
  const map = new Map<ReleaseGateKey, boolean>();
  for (const key of RELEASE_GATE_KEYS) map.set(key, false);
  for (const gate of gates) map.set(gate.gate_key, gate.passing);
  return map;
}

export function evaluateReleaseGates(facts: LaunchFacts): ReleaseGateRecord[] {
  const now = new Date().toISOString();
  const modules = new Map(facts.modules.map((row) => [row.key, row.status]));
  const criticalOpen = openCriticalBlockers(facts.blockers).length > 0 || facts.openCriticalIncidents > 0;
  const hardwareClaim = advertisedHardwareClaimed(facts.biometric);
  const uatPass = allRequiredUatPassed(facts.uat);
  const signoff = anyPilotSignedOff(facts.pilots);
  const payrollLock = modules.get("PAYROLL") === "PASS" || modules.get("PAYROLL") === "PARTIAL";
  const tenancyPartial = modules.get("AUTH") === "PASS" || modules.get("AUTH") === "PARTIAL";
  const payrollEngine = modules.get("PAYROLL") === "PASS" || modules.get("PAYROLL") === "PARTIAL";
  const statutory = modules.get("STATUTORY") === "PASS";
  const biometric = modules.get("BIOMETRIC") === "PASS";

  const computed: Record<ReleaseGateKey, { passing: boolean; evidence: string; blocker: boolean }> = {
    SECURITY: {
      passing: !criticalOpen,
      evidence: criticalOpen
        ? "Open critical security or incident items remain."
        : "No open critical security blockers in the register.",
      blocker: true,
    },
    TENANCY: {
      passing: tenancyPartial && !criticalOpen,
      evidence: "App filters by organization_id. Live second-tenant RLS proof is unverified in this environment.",
      blocker: true,
    },
    PAYROLL_RECONCILE: {
      passing: payrollEngine && facts.parallelRuns.some((row) => row.status === "SIGNED_OFF" && row.mismatch_count === 0),
      evidence: "Unit engine tests exist. Independent customer parallel-run sign-off is required before claiming reconcile.",
      blocker: true,
    },
    STATUTORY: {
      passing: statutory,
      evidence: "Seed statutory versions remain DISABLED/unverified. Official source citation is required.",
      blocker: true,
    },
    BIOMETRIC_HARDWARE: {
      passing: biometric && !hardwareClaim && facts.biometric.some((row) => row.method === "PHYSICAL_DEVICE_VERIFIED" && row.result === "PASS"),
      evidence: hardwareClaim
        ? "Advertised models are not physical-device verified."
        : "No physical device verification recorded. Demo/API ingest is not hardware certification.",
      blocker: true,
    },
    PAYROLL_LOCK: {
      passing: payrollLock,
      evidence: "Finalize/lock immutability is covered by unit tests. Do not auto-finalize pilot payroll.",
      blocker: true,
    },
    BACKUP_RESTORE: {
      passing: false,
      evidence: "Backup procedure is documented. Restore was not executed against a staging project in this environment.",
      blocker: true,
    },
    ROLLBACK_DOCS: {
      passing: true,
      evidence: "Rollback is documented in docs/ops/DEPLOY.md and docs/PRODUCTION_GO_LIVE_CHECKLIST.md.",
      blocker: true,
    },
    UAT: {
      passing: uatPass,
      evidence: uatPass ? "Recorded UAT journeys passed." : "Critical UAT journeys are not all PASS.",
      blocker: true,
    },
    PILOT_SIGNOFF: {
      passing: signoff,
      evidence: signoff ? "At least one isolated pilot organization signed off." : "No isolated pilot organization has signed off.",
      blocker: true,
    },
  };

  return RELEASE_GATE_KEYS.map((key) => ({
    id: `gate-${key.toLowerCase()}`,
    gate_key: key,
    passing: computed[key].passing,
    evidence: computed[key].evidence,
    blocker: computed[key].blocker,
    updated_by: null,
    created_at: now,
    updated_at: now,
  }));
}

export function decideLaunch(facts: LaunchFacts): { decision: LaunchDecision; summary: string; failedGates: ReleaseGateKey[] } {
  const gates = evaluateReleaseGates(facts);
  const failed = gates.filter((gate) => !gate.passing).map((gate) => gate.gate_key);
  const unsafeParallel = facts.parallelRuns.some((row) => row.finalized);
  const hardwareOverclaim = advertisedHardwareClaimed(facts.biometric);
  const critical = openCriticalBlockers(facts.blockers).length > 0 || facts.openCriticalIncidents > 0;
  if (unsafeParallel || hardwareOverclaim || critical || failed.length > 0) {
    const reasons = [
      critical ? "open critical blockers" : null,
      hardwareOverclaim ? "unverified advertised biometric models" : null,
      unsafeParallel ? "pilot payroll was finalized" : null,
      failed.length ? `failed gates: ${failed.map((key) => RELEASE_GATE_LABELS[key]).join("; ")}` : null,
    ].filter(Boolean);
    return {
      decision: "NOT_READY",
      summary: `Production launch is NOT READY. ${reasons.join(". ")}.`,
      failedGates: failed,
    };
  }
  const attendanceBlocked = facts.modules.some((row) => row.key === "ATTENDANCE" && (row.status === "BLOCKED" || row.status === "NOT_TESTED"));
  if (attendanceBlocked) {
    return {
      decision: "READY_WITH_LIMITATIONS",
      summary: "Launch gates passed with documented limitations. Phase 4 attendance remains blocked. Do not sell punch-derived LOP, late or OT.",
      failedGates: [],
    };
  }
  return {
    decision: "READY",
    summary: "All release gates passed with supporting evidence.",
    failedGates: [],
  };
}

export function defaultModuleReadiness(): Array<{ key: string; label: string; status: ModuleReadinessStatus; evidence: string; notes: string | null; sort_order: number }> {
  return [
    { key: "AUTH", label: "Authentication and organization management", status: "PARTIAL", evidence: "Username login, reset, RBAC and suspended-org block are unit tested. Live Supabase Auth path is unverified here.", notes: "Custom role editing remains read-only.", sort_order: 1 },
    { key: "EMPLOYEES", label: "Employees and documents", status: "PASS", evidence: "Employee master, statutory, bank, documents, CSV import and hierarchy exist.", notes: null, sort_order: 2 },
    { key: "BIOMETRIC", label: "Universal biometric gateway", status: "PARTIAL", evidence: "Ingest, token hash, duplicate device+user+time and mapping are unit tested. Physical hardware is not verified.", notes: "ZKTeco/Matrix are protocol foundations.", sort_order: 3 },
    { key: "ATTENDANCE", label: "Attendance and leave", status: "BLOCKED", evidence: "Leave module is complete. Phase 4 attendance engine is not started. Punches exist; days are leave/holiday marks only.", notes: "Do not sell late, OT or punch-derived LOP.", sort_order: 4 },
    { key: "SALARY", label: "Salary and compensation", status: "PASS", evidence: "Structures, assignments, revisions and formula parser exist. lateCount/otMinutes remain stubbed at 0.", notes: null, sort_order: 5 },
    { key: "BENEFITS", label: "Benefits, claims and loans", status: "PASS", evidence: "Benefits, claims and loans are consumed by payroll process.", notes: null, sort_order: 6 },
    { key: "PAYROLL", label: "Payroll and payslips", status: "PARTIAL", evidence: "Calculate/review/finalize/lock/process are unit tested. Unmarked working days are paid until Phase 4.", notes: "Do not auto-finalize or pay a pilot payroll.", sort_order: 7 },
    { key: "STATUTORY", label: "Statutory compliance", status: "NOT_TESTED", evidence: "Versioned engine exists. Seed versions are DISABLED/unverified. Official rates were not independently reviewed here.", notes: "Requires qualified payroll/accounting review.", sort_order: 8 },
    { key: "ESS", label: "Employee self-service", status: "PASS", evidence: "Server-resolved identity. Sensitive fields masked. Unit coverage for identity and tenancy.", notes: null, sort_order: 9 },
    { key: "REPORTS", label: "Reports and accounting", status: "PARTIAL", evidence: "Reports and journals consume stored/finalized data. Phase 4 attendance reports return not-calculated.", notes: null, sort_order: 10 },
    { key: "PAYMENTS", label: "Payment reconciliation", status: "PARTIAL", evidence: "Generic bank CSV and reconciliation exist. EXPORTED is not proof of payment. Live bank APIs are not implemented.", notes: null, sort_order: 11 },
    { key: "AUTOMATION", label: "Notifications and APIs", status: "PARTIAL", evidence: "Outbox, jobs, HMAC webhooks and scoped /api/v1 exist. SMTP is optional and never faked.", notes: "In-memory rate limits are per process.", sort_order: 12 },
    { key: "BILLING", label: "Subscriptions and onboarding", status: "PARTIAL", evidence: "Plans, lifecycle, CSV onboarding and support exist. Live Razorpay/GST unverified. Live import confirm outside demo is unverified.", notes: null, sort_order: 13 },
    { key: "SUPPORT", label: "Support and data exports", status: "PASS", evidence: "Org-isolated tickets, 72h export TTL without delete, SUPER_ADMIN ops.", notes: null, sort_order: 14 },
  ];
}

export function defaultReleaseBlockers() {
  return [
    {
      title: "Phase 4 attendance engine is not started",
      severity: "CRITICAL" as const,
      status: "OPEN" as const,
      module_key: "ATTENDANCE",
      evidence: "No /attendance page, no phase4.sql, late/OT stubbed at 0, unmarked working days paid.",
      required_fix: "Implement Phase 4 day engine before selling punch-based attendance or LOP.",
    },
    {
      title: "India statutory rates are unverified",
      severity: "CRITICAL" as const,
      status: "OPEN" as const,
      module_key: "STATUTORY",
      evidence: "Seed statutory_rule_versions are DISABLED/unverified. No official source citation in this environment.",
      required_fix: "Qualified payroll/accounting owner pastes official sources and enables versions.",
    },
    {
      title: "Physical biometric hardware is unverified",
      severity: "CRITICAL" as const,
      status: "OPEN" as const,
      module_key: "BIOMETRIC",
      evidence: "eSSL demo ingest is SIMULATED/API_TESTED. ZKTeco and Matrix are PROTOCOL_FOUNDATION.",
      required_fix: "Physical-device test advertised models before claiming compatibility.",
    },
    {
      title: "Live second-tenant RLS proof is unverified",
      severity: "HIGH" as const,
      status: "OPEN" as const,
      module_key: "AUTH",
      evidence: "SQL RLS exists. App filters by organization_id. Live proof against a second tenant was not run here.",
      required_fix: "Run staging cross-tenant access tests with two isolated organizations.",
    },
    {
      title: "Backup restore was not executed",
      severity: "HIGH" as const,
      status: "OPEN" as const,
      module_key: "SUPPORT",
      evidence: "docs/ops/BACKUP.md exists. Restore against a staging project was not performed in this environment.",
      required_fix: "Restore a staging backup and confirm health plus a known payroll snapshot count.",
    },
    {
      title: "Live billing provider charges are unverified",
      severity: "MEDIUM" as const,
      status: "ACCEPTED" as const,
      module_key: "BILLING",
      evidence: "Unconfigured Razorpay cannot mark paid. GST is not assumed.",
      required_fix: "Sandbox-verify Razorpay and tax config before charging customers.",
    },
  ];
}

export function defaultBiometricMatrix() {
  return [
    { vendor: "ESSL", model: "eSSL / ZKTeco ATTLOG (demo ingest)", method: "SIMULATED" as const, advertised: false, result: "PARTIAL" as ModuleReadinessStatus, notes: "Demo token ingest and unit parse/dedupe. Not a physical device certification." },
    { vendor: "ESSL", model: "eSSL PUSH JSON", method: "API_TESTED" as const, advertised: false, result: "PARTIAL" as ModuleReadinessStatus, notes: "Adapter and public /api/biometric/push are unit tested. Hardware UNVERIFIED." },
    { vendor: "ZKTECO", model: "ZKTeco PUSH / JSON", method: "SIMULATED" as const, advertised: false, result: "NOT_TESTED" as ModuleReadinessStatus, notes: "Protocol foundation only. Do not advertise as certified." },
    { vendor: "MATRIX", model: "Matrix COSEC JSON", method: "SIMULATED" as const, advertised: false, result: "NOT_TESTED" as ModuleReadinessStatus, notes: "Protocol foundation only. Do not advertise as certified." },
  ];
}

export function defaultPilotTemplates() {
  return [
    { code: "PILOT-SCHOOL", name: "Pilot school", kind: "SCHOOL" as const, notes: "Isolated school tenant template. Do not mix employees with other pilots." },
    { code: "PILOT-HOSPITAL", name: "Pilot hospital", kind: "HOSPITAL" as const, notes: "Isolated hospital/clinic tenant template. Shift coverage remains blocked until Phase 4." },
    { code: "PILOT-OFFICE", name: "Pilot office", kind: "OFFICE" as const, notes: "Isolated office/business tenant template." },
    { code: "PILOT-MULTI", name: "Pilot multi-branch", kind: "MULTI_BRANCH" as const, notes: "Isolated multi-branch tenant template. Branches stay inside this organization_id." },
  ];
}

export function stagingMustNotShareProduction(stagingUrl: string | null, productionUrl: string | null) {
  if (!stagingUrl || !productionUrl) return true;
  return stagingUrl.replace(/\/$/, "") !== productionUrl.replace(/\/$/, "");
}

export function redactHealth(text: string) {
  return !/service_role|password|whsec_|bsb_live_|RAZORPAY_KEY_SECRET/i.test(text);
}

export { RELEASE_GATE_LABELS, RELEASE_GATE_KEYS };
