import { createHmac, randomBytes } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { sha256, tokenHint } from "@/lib/biometric/hash";
import {
  findActiveMapping,
  insertDevice,
  insertMapping,
  insertNormalizedEvent,
  insertPunch,
  insertRawEvent,
  listDevices,
  listPunches,
  updateNormalizedEvent,
} from "@/lib/biometric/repository";
import { emitSafe } from "@/lib/events/emit";
import {
  DEFAULT_SMART_SETTINGS,
  DEMO_SMART_SETTINGS_ID,
  SMART_VIRTUAL_DEVICE_SERIAL,
  type GeoEventKind,
  type PunchDirection,
  type SmartAutoAcceptPolicy,
  type SmartEventSource,
  type VerificationMethod,
  type VerificationOutcome,
} from "@/lib/constants";
import { loadOrgCatalog } from "@/lib/org-data";
import { getFaceProvider } from "@/lib/smart-attendance/face-provider";
import {
  canAutoAcceptAfterVerification,
  defaultSettingsRow,
  directionFromKind,
  evaluateSmartEvent,
  normalizeRadius,
  qrExpired,
  summarizeEvents,
} from "@/lib/smart-attendance/engine";
import { signDevicePayload, verifyDeviceSignature } from "@/lib/smart-attendance/mobile-auth";
import {
  expireQrSessions,
  findQrSessionByHash,
  findSmartEventByKey,
  findTrustedDeviceByKey,
  getSmartEvent,
  getSmartSettings,
  getTrustedDevice,
  getWorkplace,
  insertGeofenceCandidate,
  insertSecurityAssessment,
  insertVerification,
  listQrSessions,
  listSmartEvents,
  listTrustedDevices,
  listVerifications,
  listWorkplaces,
  stamp,
  upsertQrSession,
  upsertSmartEvent,
  upsertSmartSettings,
  upsertTrustedDevice,
  upsertWorkplace,
} from "@/lib/smart-attendance/repository";
import type {
  AttendancePunch,
  AttendanceVerificationRecord,
  BiometricDevice,
  GeofenceEventCandidate,
  SmartAttendanceEvent,
  SmartAttendanceSettings,
  TrustedEmployeeDevice,
} from "@/types";

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret !== "replace-with-a-long-random-string") return secret;
  return "bsb-demo-qr-secret";
}

export async function ensureSmartSettings(organizationId: string, actorId: string | null) {
  const existing = await getSmartSettings(organizationId);
  if (existing) return existing;
  const now = stamp();
  return upsertSmartSettings({
    id: organizationId === "11111111-1111-1111-1111-111111111111" ? DEMO_SMART_SETTINGS_ID : crypto.randomUUID(),
    ...defaultSettingsRow(organizationId, now),
    updated_by: actorId,
  });
}

async function ensureVirtualDevice(organizationId: string, actorId: string | null): Promise<BiometricDevice> {
  const devices = await listDevices(organizationId);
  const existing = devices.find((row) => row.serial_number === SMART_VIRTUAL_DEVICE_SERIAL);
  if (existing) return existing;
  const token = randomBytes(24).toString("hex");
  const now = stamp();
  return insertDevice({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    name: "BSB Smart Attendance",
    vendor: "GENERIC",
    serial_number: SMART_VIRTUAL_DEVICE_SERIAL,
    model: "SMART-APP",
    firmware: "phase-21",
    connection_mode: "PUSH",
    branch_id: null,
    location_id: null,
    timezone: "Asia/Kolkata",
    token_hash: sha256(token),
    token_hint: tokenHint(token),
    status: "ACTIVE",
    last_seen_at: now,
    last_error: null,
    created_by: actorId,
    created_at: now,
    updated_at: now,
  });
}

async function ensureEmployeeMapping(device: BiometricDevice, employeeId: string, actorId: string | null) {
  const existing = await findActiveMapping(device.id, employeeId);
  if (existing) return existing;
  return insertMapping({
    id: crypto.randomUUID(),
    organization_id: device.organization_id,
    device_id: device.id,
    device_user_id: employeeId,
    employee_id: employeeId,
    status: "ACTIVE",
    created_by: actorId,
    created_at: stamp(),
    updated_at: stamp(),
  });
}

async function lastPunchDirection(organizationId: string, employeeId: string): Promise<PunchDirection | null> {
  const punches = await listPunches(organizationId, 200);
  const mine = punches.filter((row) => row.employee_id === employeeId);
  return mine[0]?.direction ?? null;
}

async function promoteAcceptedEvent(input: {
  organizationId: string;
  employeeId: string;
  event: SmartAttendanceEvent;
  source: "SMART_GEOFENCE" | "QR_FALLBACK";
  verificationMode: "GPS" | "QR" | "DEVICE_BIOMETRIC" | "OTHER";
  actorId: string | null;
}): Promise<AttendancePunch | null> {
  const device = await ensureVirtualDevice(input.organizationId, input.actorId);
  await ensureEmployeeMapping(device, input.employeeId, input.actorId);
  const raw = await insertRawEvent({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    device_id: device.id,
    vendor: "GENERIC",
    source: input.source,
    payload: {
      smartEventId: input.event.id,
      workplaceId: input.event.workplace_id,
      risk: input.event.risk_level,
    },
    payload_hash: sha256(input.event.idempotency_key),
    received_at: stamp(),
    ip_address: null,
    user_agent: "bsb-smart-attendance",
    status: "NORMALIZED",
    error_message: null,
  });
  const normalized = await insertNormalizedEvent({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    device_id: device.id,
    raw_event_id: raw.id,
    vendor: "GENERIC",
    device_user_id: input.employeeId,
    punched_at: input.event.occurred_at,
    punched_at_local: null,
    timezone: "Asia/Kolkata",
    direction: input.event.direction,
    verification_mode: input.verificationMode,
    work_code: "SMART",
    payload_hash: sha256(input.event.idempotency_key),
    status: "MAPPED",
    created_at: stamp(),
  });
  if (!normalized) return null;
  const punch: AttendancePunch = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    device_id: device.id,
    normalized_event_id: normalized.id,
    punched_at: input.event.occurred_at,
    punched_at_local: null,
    timezone: "Asia/Kolkata",
    direction: input.event.direction,
    verification_mode: input.verificationMode,
    source: input.source,
    created_at: stamp(),
  };
  const written = await insertPunch(punch);
  if (!written) {
    await updateNormalizedEvent(normalized.id, "DUPLICATE");
    return null;
  }
  await emitSafe({
    organizationId: input.organizationId,
    eventType: "attendance.punch.received",
    entityType: "attendance_punch",
    entityId: written.id,
    payload: { status: "RECEIVED", href: "/biometric/punches", source: input.source },
    idempotencyKey: `attendance.punch.received:${written.id}`,
  });
  return written;
}

export async function saveSmartSettings(
  organizationId: string,
  actorId: string | null,
  patch: Partial<SmartAttendanceSettings>
) {
  const current = await ensureSmartSettings(organizationId, actorId);
  const row = await upsertSmartSettings({
    ...current,
    ...patch,
    geofence_radius_meters: normalizeRadius(patch.geofence_radius_meters ?? current.geofence_radius_meters),
    face_provider_configured: false,
    face_provider_kind: "NONE",
    updated_by: actorId,
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "smart.settings.updated",
    entityType: "smart_attendance_settings",
    entityId: row.id,
    metadata: { enabled: row.enabled, radius: row.geofence_radius_meters },
  });
  return row;
}

export async function saveWorkplace(
  organizationId: string,
  actorId: string | null,
  input: {
    id?: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    branchId?: string;
    locationId?: string;
    status?: "ACTIVE" | "DISABLED";
  }
) {
  const now = stamp();
  const existing = input.id ? await getWorkplace(organizationId, input.id) : null;
  const row = await upsertWorkplace({
    id: existing?.id ?? crypto.randomUUID(),
    organization_id: organizationId,
    location_id: input.locationId || existing?.location_id || null,
    branch_id: input.branchId || existing?.branch_id || null,
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    radius_meters: normalizeRadius(input.radiusMeters),
    status: input.status ?? existing?.status ?? "ACTIVE",
    created_by: existing?.created_by ?? actorId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: "smart.workplace.saved",
    entityType: "attendance_location_config",
    entityId: row.id,
  });
  return row;
}

export async function registerTrustedDevice(input: {
  organizationId: string;
  employeeId: string;
  publicKey: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  attestationKind?: string;
  attestationResult?: string;
  actorId: string | null;
}) {
  const settings = await ensureSmartSettings(input.organizationId, input.actorId);
  const existingKey = await findTrustedDeviceByKey(input.organizationId, input.publicKey);
  if (existingKey && existingKey.employee_id !== input.employeeId) {
    throw new Error("This device credential is already bound to another employee.");
  }
  const devices = await listTrustedDevices(input.organizationId, input.employeeId);
  const active = devices.filter((row) => row.status === "ACTIVE" || row.status === "PENDING");
  if (!existingKey && active.length >= settings.max_trusted_devices) {
    throw new Error(`Maximum trusted devices (${settings.max_trusted_devices}) already registered. Request replacement or revoke one.`);
  }
  const now = stamp();
  const row = await upsertTrustedDevice({
    id: existingKey?.id ?? crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    public_key: input.publicKey,
    device_model: input.deviceModel,
    os_version: input.osVersion,
    app_version: input.appVersion,
    attestation_kind: input.attestationKind ?? "NONE",
    attestation_result: input.attestationResult || "UNAVAILABLE",
    status: existingKey?.status === "ACTIVE" ? "ACTIVE" : "PENDING",
    registered_at: existingKey?.registered_at ?? now,
    last_active_at: now,
    revoked_at: null,
    revoked_reason: null,
    created_at: existingKey?.created_at ?? now,
    updated_at: now,
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "smart.device.registered",
    entityType: "trusted_employee_device",
    entityId: row.id,
    metadata: { status: row.status, model: row.device_model },
  });
  return row;
}

export async function setTrustedDeviceStatus(
  organizationId: string,
  deviceId: string,
  status: TrustedEmployeeDevice["status"],
  reason: string | null,
  actorId: string | null
) {
  const existing = await getTrustedDevice(organizationId, deviceId);
  if (!existing) throw new Error("Trusted device not found.");
  const now = stamp();
  const row = await upsertTrustedDevice({
    ...existing,
    status,
    revoked_at: status === "REVOKED" || status === "LOST" ? now : existing.revoked_at,
    revoked_reason: reason,
    updated_at: now,
  });
  await writeAudit({
    organizationId,
    actorUserId: actorId,
    action: `smart.device.${status.toLowerCase()}`,
    entityType: "trusted_employee_device",
    entityId: row.id,
    metadata: { reason },
  });
  return row;
}

type EventSubmit = {
  organizationId: string;
  employeeId: string;
  deviceId: string;
  workplaceId: string;
  kind?: GeoEventKind;
  direction: PunchDirection;
  source: SmartEventSource;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  occurredAt: string;
  permissionStatus?: string;
  mockLocation?: boolean;
  integrityResult?: string | null;
  idempotencyKey: string;
  signature: string;
  actorId: string | null;
};

async function submitSmartEvent(input: EventSubmit) {
  const duplicate = await findSmartEventByKey(input.organizationId, input.idempotencyKey);
  if (duplicate) return duplicate;
  const settings = await ensureSmartSettings(input.organizationId, input.actorId);
  const catalog = await loadOrgCatalog(input.organizationId);
  const employee = catalog.employees.find((row) => row.id === input.employeeId && row.organization_id === input.organizationId);
  const device = await getTrustedDevice(input.organizationId, input.deviceId);
  const workplace = await getWorkplace(input.organizationId, input.workplaceId);
  if (device && !verifyDeviceSignature(device.public_key, input.idempotencyKey, input.signature)) {
    throw new Error("Device signature is invalid.");
  }
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid event timestamp.");
  const receivedAt = new Date();
  const previous = await lastPunchDirection(input.organizationId, input.employeeId);
  const evaluation = evaluateSmartEvent({
    settings,
    employeeActive: employee?.status === "ACTIVE",
    membershipActive: Boolean(employee),
    device,
    workplace,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    occurredAt,
    receivedAt,
    mockLocation: Boolean(input.mockLocation),
    integrityResult: input.integrityResult ?? "UNAVAILABLE",
    previousDirection: previous,
    requestedDirection: input.direction,
    duplicate: false,
    timeZone: "Asia/Kolkata",
  });

  let candidate: GeofenceEventCandidate | null = null;
  if (input.source === "GEOFENCE" && input.kind) {
    candidate = await insertGeofenceCandidate({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      employee_id: input.employeeId,
      device_id: input.deviceId,
      workplace_id: input.workplaceId,
      kind: input.kind,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_meters: input.accuracyMeters,
      occurred_at: occurredAt.toISOString(),
      received_at: receivedAt.toISOString(),
      permission_status: input.permissionStatus ?? "GRANTED",
      mock_location: Boolean(input.mockLocation),
      integrity_result: input.integrityResult ?? "UNAVAILABLE",
      idempotency_key: input.idempotencyKey,
      created_at: stamp(),
    });
  }

  if (device) {
    await insertSecurityAssessment({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      device_id: device.id,
      mock_location: Boolean(input.mockLocation),
      play_integrity: input.integrityResult ?? "UNAVAILABLE",
      rooted: null,
      notes: "Mock location and Play Integrity are risk signals, not perfect fraud detection.",
      assessed_at: stamp(),
      created_at: stamp(),
    });
    await upsertTrustedDevice({ ...device, last_active_at: stamp(), updated_at: stamp() });
  }

  let event: SmartAttendanceEvent = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    employee_id: input.employeeId,
    device_id: input.deviceId,
    workplace_id: input.workplaceId,
    candidate_id: candidate?.id ?? null,
    source: input.source,
    direction: input.direction,
    status: evaluation.status,
    risk_level: evaluation.risk,
    risk_reasons: evaluation.reasons,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_meters: input.accuracyMeters,
    occurred_at: occurredAt.toISOString(),
    idempotency_key: input.idempotencyKey,
    punch_id: null,
    notes: evaluation.requiredVerification === "NONE" ? null : `Requires ${evaluation.requiredVerification}.`,
    reviewed_by: null,
    reviewed_at: null,
    created_at: stamp(),
    updated_at: stamp(),
  };

  if (evaluation.acceptToEngine) {
    const punch = await promoteAcceptedEvent({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      event,
      source: input.source === "QR" ? "QR_FALLBACK" : "SMART_GEOFENCE",
      verificationMode: input.source === "QR" ? "QR" : "GPS",
      actorId: input.actorId,
    });
    event = { ...event, punch_id: punch?.id ?? null, status: punch ? "ACCEPTED" : "DUPLICATE" };
  }

  const saved = await upsertSmartEvent(event);
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "smart.event.recorded",
    entityType: "smart_attendance_event",
    entityId: saved.id,
    metadata: { status: saved.status, risk: saved.risk_level, source: saved.source },
  });
  return saved;
}

export async function recordGeofenceEvent(input: {
  organizationId: string;
  employeeId: string;
  deviceId: string;
  workplaceId: string;
  kind: GeoEventKind;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  occurredAt: string;
  permissionStatus: string;
  mockLocation?: boolean;
  integrityResult?: string | null;
  idempotencyKey: string;
  signature: string;
  actorId: string | null;
}) {
  return submitSmartEvent({
    ...input,
    direction: directionFromKind(input.kind),
    source: "GEOFENCE",
  });
}

export async function createQrSession(input: {
  organizationId: string;
  workplaceId: string;
  direction: PunchDirection;
  actorId: string | null;
}) {
  const settings = await ensureSmartSettings(input.organizationId, input.actorId);
  if (!settings.qr_fallback_enabled) throw new Error("Dynamic QR fallback is disabled.");
  const workplace = await getWorkplace(input.organizationId, input.workplaceId);
  if (!workplace || workplace.status !== "ACTIVE") throw new Error("Workplace not found.");
  const token = randomBytes(24).toString("hex");
  const pin = settings.dynamic_pin_enabled ? String(Math.floor(100000 + Math.random() * 900000)) : null;
  const now = Date.now();
  const expires = new Date(now + settings.qr_ttl_seconds * 1000).toISOString();
  const payload = JSON.stringify({
    v: 1,
    org: input.organizationId,
    workplace: input.workplaceId,
    direction: input.direction,
    exp: expires,
    token,
  });
  const signed = `${payload}.${createHmac("sha256", signingSecret()).update(payload).digest("hex")}`;
  const row = await upsertQrSession({
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    workplace_id: input.workplaceId,
    token_hash: sha256(token),
    token_hint: tokenHint(token),
    pin_hash: pin ? sha256(pin) : null,
    direction: input.direction,
    status: "ACTIVE",
    expires_at: expires,
    used_at: null,
    used_by_employee_id: null,
    created_by: input.actorId,
    created_at: stamp(),
    updated_at: stamp(),
  });
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "smart.qr.created",
    entityType: "dynamic_qr_session",
    entityId: row.id,
    metadata: { workplaceId: input.workplaceId, ttl: settings.qr_ttl_seconds },
  });
  return { session: row, token: signed, pin, expiresAt: expires };
}

export async function scanQr(input: {
  organizationId: string;
  employeeId: string;
  deviceId: string;
  token: string;
  pin?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  occurredAt: string;
  mockLocation?: boolean;
  integrityResult?: string | null;
  idempotencyKey: string;
  signature: string;
  actorId: string | null;
}) {
  const settings = await ensureSmartSettings(input.organizationId, input.actorId);
  if (!settings.qr_fallback_enabled) throw new Error("Dynamic QR fallback is disabled.");
  const [payload, sig] = (() => {
    const idx = input.token.lastIndexOf(".");
    if (idx < 0) return [null, null] as const;
    return [input.token.slice(0, idx), input.token.slice(idx + 1)] as const;
  })();
  if (!payload || !sig) throw new Error("QR token is malformed. Permanent static QR codes are not accepted.");
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  if (expected !== sig) throw new Error("QR signature is invalid.");
  const parsed = JSON.parse(payload) as { token?: string; workplace?: string; direction?: PunchDirection; exp?: string; org?: string };
  if (parsed.org && parsed.org !== input.organizationId) throw new Error("QR belongs to another organization.");
  const session = parsed.token ? await findQrSessionByHash(sha256(parsed.token)) : null;
  if (!session) throw new Error("QR session not found.");
  if (session.status !== "ACTIVE") throw new Error("QR session is no longer active.");
  if (qrExpired(new Date(session.expires_at), new Date())) {
    await upsertQrSession({ ...session, status: "EXPIRED", updated_at: stamp() });
    throw new Error("QR token has expired.");
  }
  if (session.pin_hash) {
    if (!input.pin || sha256(input.pin) !== session.pin_hash) throw new Error("Dynamic PIN is required and did not match.");
  }
  const event = await submitSmartEvent({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    deviceId: input.deviceId,
    workplaceId: session.workplace_id,
    direction: session.direction,
    source: "QR",
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    occurredAt: input.occurredAt,
    mockLocation: input.mockLocation,
    integrityResult: input.integrityResult,
    idempotencyKey: input.idempotencyKey,
    signature: input.signature,
    actorId: input.actorId,
  });
  if (event.status === "ACCEPTED" || event.status === "PENDING_VERIFICATION" || event.status === "PENDING_REVIEW") {
    await upsertQrSession({
      ...session,
      status: event.status === "ACCEPTED" ? "USED" : session.status,
      used_at: event.status === "ACCEPTED" ? stamp() : session.used_at,
      used_by_employee_id: event.status === "ACCEPTED" ? input.employeeId : session.used_by_employee_id,
      updated_at: stamp(),
    });
  }
  return event;
}

export async function recordVerification(input: {
  organizationId: string;
  eventId: string;
  method: VerificationMethod;
  outcome: VerificationOutcome;
  notes?: string;
  actorId: string | null;
}) {
  const event = await getSmartEvent(input.organizationId, input.eventId);
  if (!event) throw new Error("Smart attendance event not found.");
  const settings = await ensureSmartSettings(input.organizationId, input.actorId);
  let outcome = input.outcome;
  let notes = input.notes ?? "";
  if (input.method === "FACE_PROVIDER") {
    const provider = getFaceProvider(settings.face_provider_kind, settings.face_provider_configured);
    const result = await provider.verify({ eventId: event.id });
    outcome = result.outcome;
    notes = result.notes;
  }
  const record: AttendanceVerificationRecord = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    event_id: event.id,
    method: input.method,
    outcome,
    provider: input.method === "FACE_PROVIDER" ? settings.face_provider_kind : null,
    risk_reason: notes || event.risk_reasons.join("; "),
    recorded_at: stamp(),
    created_at: stamp(),
  };
  await insertVerification(record);
  let next = event;
  if (canAutoAcceptAfterVerification(settings.auto_accept_policy as SmartAutoAcceptPolicy, event.risk_level, outcome)) {
    const punch = await promoteAcceptedEvent({
      organizationId: input.organizationId,
      employeeId: event.employee_id,
      event,
      source: event.source === "QR" ? "QR_FALLBACK" : "SMART_GEOFENCE",
      verificationMode: input.method === "DEVICE_BIOMETRIC" ? "DEVICE_BIOMETRIC" : event.source === "QR" ? "QR" : "GPS",
      actorId: input.actorId,
    });
    next = {
      ...event,
      status: punch ? "ACCEPTED" : "DUPLICATE",
      punch_id: punch?.id ?? event.punch_id,
      reviewed_by: input.actorId,
      reviewed_at: stamp(),
      updated_at: stamp(),
    };
  } else if (outcome === "FAILED") {
    next = { ...event, status: "REJECTED", reviewed_by: input.actorId, reviewed_at: stamp(), updated_at: stamp() };
  } else if (input.method === "HR_REVIEW" && outcome === "PASSED") {
    const punch = await promoteAcceptedEvent({
      organizationId: input.organizationId,
      employeeId: event.employee_id,
      event,
      source: event.source === "QR" ? "QR_FALLBACK" : "SMART_GEOFENCE",
      verificationMode: "OTHER",
      actorId: input.actorId,
    });
    next = {
      ...event,
      status: punch ? "ACCEPTED" : "DUPLICATE",
      punch_id: punch?.id ?? event.punch_id,
      reviewed_by: input.actorId,
      reviewed_at: stamp(),
      notes: notes || "Authorized HR correction. Finalized attendance days are not rewritten.",
      updated_at: stamp(),
    };
  }
  const saved = await upsertSmartEvent(next);
  await writeAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorId,
    action: "smart.verification.recorded",
    entityType: "attendance_verification_record",
    entityId: record.id,
    metadata: { outcome, method: input.method, eventId: event.id },
  });
  return saved;
}

export async function loadSmartDashboard(organizationId: string) {
  const [settings, workplaces, devices, events, qr] = await Promise.all([
    ensureSmartSettings(organizationId, null),
    listWorkplaces(organizationId),
    listTrustedDevices(organizationId),
    listSmartEvents(organizationId),
    listQrSessions(organizationId),
  ]);
  const summary = summarizeEvents(events);
  return {
    settings,
    workplaces,
    devices,
    events,
    qr,
    counts: {
      trusted: devices.length,
      activeDevices: devices.filter((row) => row.status === "ACTIVE").length,
      pendingDevices: devices.filter((row) => row.status === "PENDING" || row.status === "REPLACEMENT_PENDING").length,
      ...summary,
    },
  };
}

export async function loadEmployeeSmart(organizationId: string, employeeId: string) {
  const [settings, workplaces, devices, events] = await Promise.all([
    ensureSmartSettings(organizationId, null),
    listWorkplaces(organizationId),
    listTrustedDevices(organizationId, employeeId),
    listSmartEvents(organizationId, employeeId),
  ]);
  return { settings, workplaces: workplaces.filter((row) => row.status === "ACTIVE"), devices, events };
}

export async function expireSmartQrJob() {
  return expireQrSessions(stamp());
}

export {
  listWorkplaces,
  listTrustedDevices,
  listSmartEvents,
  listQrSessions,
  listVerifications,
  getSmartEvent,
  DEFAULT_SMART_SETTINGS,
};

export function deviceChallengePayload(device: TrustedEmployeeDevice, nonce: string) {
  return signDevicePayload(device.public_key, nonce);
}
