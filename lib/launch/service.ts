import { writeAudit } from "@/lib/audit";
import {
  classifyFeedback,
  decideLaunch,
  defaultBiometricMatrix,
  defaultModuleReadiness,
  defaultPilotTemplates,
  defaultReleaseBlockers,
  evaluateReleaseGates,
  incidentNumber,
  PILOT_CHECKLIST_STEPS,
  sanitizeIncidentText,
  stagingMustNotShareProduction,
  UAT_JOURNEYS,
  type LaunchFacts,
} from "@/lib/launch/engine";
import {
  getPilotOrganization,
  insertLaunchDecision,
  listBiometricVerifications,
  listIncidents,
  listLaunchDecisions,
  listModuleReadiness,
  listParallelPayrollRuns,
  listPilotChecklist,
  listPilotFeedback,
  listPilotOrganizations,
  listReleaseBlockers,
  listReleaseGates,
  listUatChecklist,
  listUatChecklistForPilot,
  nextIncidentSequence,
  stamp,
  upsertBiometricVerification,
  upsertIncident,
  upsertModuleReadiness,
  upsertParallelPayrollRun,
  upsertPilotChecklistItem,
  upsertPilotFeedback,
  upsertPilotOrganization,
  upsertReleaseBlocker,
  upsertReleaseGate,
  upsertUatChecklistItem,
} from "@/lib/launch/repository";
import { collectHealth } from "@/lib/observability/health";
import type {
  BiometricTestMethod,
  FeedbackKind,
  IncidentSeverity,
  ModuleReadinessStatus,
  ReleaseBlockerSeverity,
  UatResultStatus,
} from "@/lib/constants";

function factsFrom(
  modules: Awaited<ReturnType<typeof listModuleReadiness>>,
  blockers: Awaited<ReturnType<typeof listReleaseBlockers>>,
  gates: Awaited<ReturnType<typeof listReleaseGates>>,
  pilots: Awaited<ReturnType<typeof listPilotOrganizations>>,
  biometric: Awaited<ReturnType<typeof listBiometricVerifications>>,
  parallelRuns: Awaited<ReturnType<typeof listParallelPayrollRuns>>,
  uat: Awaited<ReturnType<typeof listUatChecklist>>,
  incidents: Awaited<ReturnType<typeof listIncidents>>
): LaunchFacts {
  return {
    modules: modules.map((row) => ({ key: row.module_key, status: row.status })),
    blockers: blockers.map((row) => ({ severity: row.severity, status: row.status })),
    gates: gates.map((row) => ({ gate_key: row.gate_key, passing: row.passing })),
    pilots: pilots.map((row) => ({ status: row.status })),
    biometric: biometric.map((row) => ({ method: row.method, advertised: row.advertised, result: row.result })),
    parallelRuns: parallelRuns.map((row) => ({
      status: row.status,
      mismatch_count: row.mismatch_count,
      finalized: row.finalized,
    })),
    uat: uat.map((row) => ({ status: row.status })),
    openCriticalIncidents: incidents.filter(
      (row) => row.severity === "CRITICAL" && (row.status === "OPEN" || row.status === "MITIGATING")
    ).length,
  };
}

export async function ensureLaunchCatalog(actorId: string | null) {
  const now = stamp();
  const existingModules = await listModuleReadiness();
  if (existingModules.length === 0) {
    for (const row of defaultModuleReadiness()) {
      await upsertModuleReadiness({
        id: crypto.randomUUID(),
        module_key: row.key,
        label: row.label,
        status: row.status,
        evidence: row.evidence,
        notes: row.notes,
        sort_order: row.sort_order,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      });
    }
  }
  const existingBlockers = await listReleaseBlockers();
  if (existingBlockers.length === 0) {
    for (const row of defaultReleaseBlockers()) {
      await upsertReleaseBlocker({
        id: crypto.randomUUID(),
        title: row.title,
        severity: row.severity,
        status: row.status,
        module_key: row.module_key,
        evidence: row.evidence,
        required_fix: row.required_fix,
        organization_id: null,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
      });
    }
  }
  const existingBiometric = await listBiometricVerifications();
  if (existingBiometric.length === 0) {
    for (const row of defaultBiometricMatrix()) {
      await upsertBiometricVerification({
        id: crypto.randomUUID(),
        vendor: row.vendor,
        model: row.model,
        method: row.method,
        advertised: row.advertised,
        result: row.result,
        notes: row.notes,
        tested_at: null,
        created_at: now,
        updated_at: now,
      });
    }
  }
  const existingPilots = await listPilotOrganizations();
  if (existingPilots.length === 0) {
    for (const row of defaultPilotTemplates()) {
      const pilot = await upsertPilotOrganization({
        id: crypto.randomUUID(),
        code: row.code,
        name: row.name,
        kind: row.kind,
        status: "PREPARED",
        organization_id: null,
        contact_name: null,
        notes: row.notes,
        signed_off_at: null,
        created_by: actorId,
        created_at: now,
        updated_at: now,
      });
      for (const step of PILOT_CHECKLIST_STEPS) {
        await upsertPilotChecklistItem({
          id: crypto.randomUUID(),
          pilot_id: pilot.id,
          step_key: step.key,
          label: step.label,
          required: step.required,
          complete: false,
          evidence: step.required ? null : "Optional until Phase 4 exists.",
          updated_by: actorId,
          created_at: now,
          updated_at: now,
        });
      }
      for (const journey of UAT_JOURNEYS) {
        await upsertUatChecklistItem({
          id: crypto.randomUUID(),
          pilot_id: pilot.id,
          role_code: journey.role,
          journey: journey.journey,
          status: journey.role === "HR" && journey.journey.includes("shifts") ? "BLOCKED" : "NOT_TESTED",
          tester: null,
          evidence: journey.role === "HR" ? "Shift/attendance journeys are blocked until Phase 4." : null,
          tested_at: null,
          created_at: now,
          updated_at: now,
        });
      }
      await upsertParallelPayrollRun({
        id: crypto.randomUUID(),
        pilot_id: pilot.id,
        period_label: "Period 1 (not finalized)",
        status: "DRAFT",
        expected_net: null,
        calculated_net: null,
        mismatch_count: 0,
        notes: "Compare against independently verified records. Do not finalize or pay.",
        finalized: false,
        created_by: actorId,
        created_at: now,
        updated_at: now,
      });
      await upsertParallelPayrollRun({
        id: crypto.randomUUID(),
        pilot_id: pilot.id,
        period_label: "Period 2 (not finalized)",
        status: "DRAFT",
        expected_net: null,
        calculated_net: null,
        mismatch_count: 0,
        notes: "Second representative period. Do not finalize or pay.",
        finalized: false,
        created_by: actorId,
        created_at: now,
        updated_at: now,
      });
    }
  }
}

export async function loadLaunchControl(actorId: string | null) {
  await ensureLaunchCatalog(actorId);
  const [modules, blockers, pilots, biometric, parallelRuns, uat, incidents, feedback, previous] = await Promise.all([
    listModuleReadiness(),
    listReleaseBlockers(),
    listPilotOrganizations(),
    listBiometricVerifications(),
    listParallelPayrollRuns(),
    listUatChecklist(),
    listIncidents(),
    listPilotFeedback(),
    listLaunchDecisions(),
  ]);
  const facts = factsFrom(modules, blockers, [], pilots, biometric, parallelRuns, uat, incidents);
  const gates = evaluateReleaseGates(facts);
  for (const gate of gates) {
    await upsertReleaseGate(gate);
  }
  const verdict = decideLaunch(facts);
  const health = collectHealth();
  const stagingOk = stagingMustNotShareProduction(
    process.env.NEXT_PUBLIC_STAGING_APP_URL ?? null,
    process.env.NEXT_PUBLIC_APP_URL ?? null
  );
  return {
    modules,
    blockers,
    pilots,
    biometric,
    parallelRuns,
    uat,
    incidents,
    feedback,
    gates,
    verdict,
    previous: previous[0] ?? null,
    health,
    stagingOk,
    demoMode: health.mode === "demo",
  };
}

export async function recordLaunchDecision(actorId: string | null) {
  const snapshot = await loadLaunchControl(actorId);
  const now = stamp();
  const row = await insertLaunchDecision({
    id: crypto.randomUUID(),
    decision: snapshot.verdict.decision,
    summary: snapshot.verdict.summary,
    evidence_json: JSON.stringify({
      failedGates: snapshot.verdict.failedGates,
      demoMode: snapshot.demoMode,
      stagingSeparated: snapshot.stagingOk,
    }),
    decided_by: actorId,
    decided_at: now,
    created_at: now,
    updated_at: now,
  });
  await writeAudit({
    organizationId: null,
    actorUserId: actorId,
    action: "launch.decision.recorded",
    entityType: "launch_decision",
    entityId: row.id,
    metadata: { decision: row.decision },
  });
  return row;
}

export async function createIncident(input: {
  title: string;
  severity: IncidentSeverity;
  impact: string;
  organizationId?: string;
  actorId: string | null;
}) {
  const now = stamp();
  const sequence = await nextIncidentSequence();
  const row = await upsertIncident({
    id: crypto.randomUUID(),
    incident_number: incidentNumber(sequence),
    organization_id: input.organizationId || null,
    severity: input.severity,
    status: "OPEN",
    title: sanitizeIncidentText(input.title),
    impact: sanitizeIncidentText(input.impact),
    started_at: now,
    ended_at: null,
    resolution: null,
    created_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
  await writeAudit({
    organizationId: row.organization_id,
    actorUserId: input.actorId,
    action: "incident.opened",
    entityType: "incident",
    entityId: row.id,
    metadata: { severity: row.severity, number: row.incident_number },
  });
  return row;
}

export async function resolveIncident(incidentId: string, resolution: string, actorId: string | null) {
  const rows = await listIncidents();
  const existing = rows.find((row) => row.id === incidentId);
  if (!existing) throw new Error("Incident not found.");
  if (existing.status === "CLOSED") throw new Error("Closed incidents cannot be edited.");
  const now = stamp();
  const row = await upsertIncident({
    ...existing,
    status: "RESOLVED",
    resolution: sanitizeIncidentText(resolution),
    ended_at: now,
    updated_at: now,
  });
  await writeAudit({
    organizationId: row.organization_id,
    actorUserId: actorId,
    action: "incident.resolved",
    entityType: "incident",
    entityId: row.id,
    metadata: { number: row.incident_number },
  });
  return row;
}

export async function createFeedback(input: {
  pilotId: string;
  moduleKey: string;
  kind: FeedbackKind;
  severity: ReleaseBlockerSeverity;
  summary: string;
  reproduction?: string;
  actorId: string | null;
}) {
  const pilot = await getPilotOrganization(input.pilotId);
  if (!pilot) throw new Error("Pilot organization not found.");
  const now = stamp();
  const row = await upsertPilotFeedback({
    id: crypto.randomUUID(),
    pilot_id: pilot.id,
    organization_id: pilot.organization_id,
    module_key: input.moduleKey.toUpperCase(),
    kind: input.kind,
    severity: input.severity,
    status: classifyFeedback(input.kind, input.severity) === "defect-priority" ? "TRIAGED" : "OPEN",
    summary: sanitizeIncidentText(input.summary),
    reproduction: input.reproduction ? sanitizeIncidentText(input.reproduction) : null,
    release_version: "phase-20",
    created_by: input.actorId,
    created_at: now,
    updated_at: now,
  });
  if (input.kind === "DEFECT" && (input.severity === "CRITICAL" || input.severity === "HIGH")) {
    await upsertReleaseBlocker({
      id: crypto.randomUUID(),
      title: row.summary,
      severity: input.severity,
      status: "OPEN",
      module_key: row.module_key,
      evidence: row.reproduction || "Pilot defect recorded from feedback.",
      required_fix: "Fix before launch. Cosmetic work is deferred.",
      organization_id: pilot.organization_id,
      updated_by: input.actorId,
      created_at: now,
      updated_at: now,
    });
  }
  return row;
}

export async function recordUatResult(itemId: string, status: UatResultStatus, tester: string, evidence: string | null, actorId: string | null) {
  const rows = await listUatChecklist();
  const existing = rows.find((row) => row.id === itemId);
  if (!existing) throw new Error("UAT item not found.");
  if (existing.status === "BLOCKED" && status === "PASS") {
    throw new Error("Blocked journeys cannot be marked PASS. Phase 4 attendance remains unavailable.");
  }
  const row = await upsertUatChecklistItem({
    ...existing,
    status,
    tester: sanitizeIncidentText(tester),
    evidence: evidence ? sanitizeIncidentText(evidence) : existing.evidence,
    tested_at: stamp(),
    updated_at: stamp(),
  });
  const pilot = await getPilotOrganization(existing.pilot_id);
  await writeAudit({
    organizationId: pilot?.organization_id ?? null,
    actorUserId: actorId,
    action: "uat.result.recorded",
    entityType: "uat_checklist",
    entityId: row.id,
    metadata: { status: row.status },
  });
  return row;
}

export async function compareParallelRun(runId: string, expectedNet: number, calculatedNet: number, notes: string | null, actorId: string | null) {
  const rows = await listParallelPayrollRuns();
  const existing = rows.find((row) => row.id === runId);
  if (!existing) throw new Error("Parallel run not found.");
  if (existing.finalized) throw new Error("Pilot payroll must not be finalized.");
  const mismatch = Math.round(Math.abs(expectedNet - calculatedNet) * 100) / 100;
  return upsertParallelPayrollRun({
    ...existing,
    expected_net: expectedNet,
    calculated_net: calculatedNet,
    mismatch_count: mismatch === 0 ? 0 : 1,
    status: mismatch === 0 ? "COMPARED" : "MISMATCHED",
    notes: notes ? sanitizeIncidentText(notes) : existing.notes,
    finalized: false,
    created_by: actorId ?? existing.created_by,
    updated_at: stamp(),
  });
}

export async function recordBiometricVerification(input: {
  vendor: string;
  model: string;
  method: BiometricTestMethod;
  advertised: boolean;
  result: ModuleReadinessStatus;
  notes: string;
}) {
  if (input.advertised && input.method !== "PHYSICAL_DEVICE_VERIFIED") {
    throw new Error("Advertised models require PHYSICAL_DEVICE_VERIFIED. Do not claim untested hardware.");
  }
  if (input.method === "PHYSICAL_DEVICE_VERIFIED" && input.result === "PASS") {
    throw new Error("No physical-device evidence exists in this environment. Record SIMULATED or API_TESTED only.");
  }
  const now = stamp();
  return upsertBiometricVerification({
    id: crypto.randomUUID(),
    vendor: input.vendor,
    model: sanitizeIncidentText(input.model),
    method: input.method,
    advertised: input.advertised,
    result: input.result,
    notes: sanitizeIncidentText(input.notes),
    tested_at: now,
    created_at: now,
    updated_at: now,
  });
}

export async function signOffPilot(pilotId: string, actorId: string | null) {
  const pilot = await getPilotOrganization(pilotId);
  if (!pilot) throw new Error("Pilot organization not found.");
  const checklist = await listPilotChecklist(pilotId);
  const requiredIncomplete = checklist.filter((row) => row.required && !row.complete);
  if (requiredIncomplete.length > 0) {
    throw new Error("Required pilot checklist steps are incomplete.");
  }
  const uat = await listUatChecklistForPilot(pilotId);
  if (uat.some((row) => row.status === "FAIL")) {
    throw new Error("Failed UAT journeys block sign-off.");
  }
  const now = stamp();
  const row = await upsertPilotOrganization({
    ...pilot,
    status: "SIGNED_OFF",
    signed_off_at: now,
    updated_at: now,
  });
  await writeAudit({
    organizationId: row.organization_id,
    actorUserId: actorId,
    action: "pilot.signed_off",
    entityType: "pilot_organization",
    entityId: row.id,
    metadata: { status: row.status },
  });
  return row;
}

export async function togglePilotChecklist(itemId: string, complete: boolean, evidence: string | null, actorId: string | null) {
  const pilots = await listPilotOrganizations();
  for (const pilot of pilots) {
    const items = await listPilotChecklist(pilot.id);
    const existing = items.find((row) => row.id === itemId);
    if (!existing) continue;
    if (existing.step_key === "SHIFTS" && complete) {
      throw new Error("Shifts cannot be marked complete. Phase 4 attendance is not started.");
    }
    return upsertPilotChecklistItem({
      ...existing,
      complete,
      evidence: evidence ? sanitizeIncidentText(evidence) : existing.evidence,
      updated_by: actorId,
      updated_at: stamp(),
    });
  }
  throw new Error("Checklist item not found.");
}

export async function markIncidentSla() {
  const open = (await listIncidents()).filter((row) => row.status === "OPEN" || row.status === "MITIGATING");
  return { open: open.length, critical: open.filter((row) => row.severity === "CRITICAL").length };
}

export {
  listModuleReadiness,
  listReleaseBlockers,
  listPilotOrganizations,
  listPilotChecklist,
  listBiometricVerifications,
  listParallelPayrollRuns,
  listUatChecklist,
  listIncidents,
  listPilotFeedback,
  listReleaseGates,
  listLaunchDecisions,
  getPilotOrganization,
};
