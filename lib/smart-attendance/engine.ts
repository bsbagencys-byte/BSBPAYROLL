import {
  DEFAULT_SMART_SETTINGS,
  GEOFENCE_RADIUS_PRESETS,
  type AttendanceRiskLevel,
  type GeoEventKind,
  type PunchDirection,
  type SmartAutoAcceptPolicy,
  type SmartEventStatus,
  type VerificationMethod,
} from "@/lib/constants";
import type { AttendanceLocationConfig, SmartAttendanceSettings, TrustedEmployeeDevice } from "@/types";

export const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeRadius(meters: number) {
  if (!Number.isFinite(meters) || meters < 30) return DEFAULT_SMART_SETTINGS.geofenceRadiusMeters;
  if (meters > 2000) return 2000;
  return Math.round(meters);
}

export function radiusIsPreset(meters: number) {
  return (GEOFENCE_RADIUS_PRESETS as readonly number[]).includes(meters);
}

export function parseClockMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function inEntryWindow(occurredAt: Date, start: string, end: string, timeZone = "Asia/Kolkata") {
  const startMin = parseClockMinutes(start);
  const endMin = parseClockMinutes(end);
  if (startMin === null || endMin === null) return true;
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(occurredAt);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const current = hour * 60 + minute;
  if (startMin <= endMin) return current >= startMin && current <= endMin;
  return current >= startMin || current <= endMin;
}

export function eventFreshnessMs(occurredAt: Date, receivedAt: Date) {
  return receivedAt.getTime() - occurredAt.getTime();
}

export function directionFromKind(kind: GeoEventKind): PunchDirection {
  if (kind === "EXIT") return "OUT";
  return "IN";
}

export type ValidationSignal = {
  code: string;
  message: string;
  weight: AttendanceRiskLevel;
};

export type EvaluationInput = {
  settings: Pick<
    SmartAttendanceSettings,
    | "enabled"
    | "accuracy_threshold_meters"
    | "freshness_seconds"
    | "require_trusted_device"
    | "auto_accept_policy"
    | "entry_window_start"
    | "entry_window_end"
    | "exit_window_start"
    | "exit_window_end"
    | "duplicate_interval_seconds"
    | "face_provider_configured"
    | "qr_fallback_enabled"
  >;
  employeeActive: boolean;
  membershipActive: boolean;
  device: Pick<TrustedEmployeeDevice, "status" | "employee_id"> | null;
  workplace: Pick<AttendanceLocationConfig, "latitude" | "longitude" | "radius_meters" | "status"> | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  occurredAt: Date;
  receivedAt: Date;
  mockLocation: boolean;
  integrityResult: string | null;
  previousDirection: PunchDirection | null;
  previousOccurredAt?: Date | null;
  requestedDirection: PunchDirection;
  duplicate: boolean;
  timeZone?: string;
};

export type EvaluationResult = {
  status: SmartEventStatus;
  risk: AttendanceRiskLevel;
  reasons: string[];
  signals: ValidationSignal[];
  requiredVerification: VerificationMethod;
  acceptToEngine: boolean;
};

function worse(a: AttendanceRiskLevel, b: AttendanceRiskLevel): AttendanceRiskLevel {
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function evaluateSmartEvent(input: EvaluationInput): EvaluationResult {
  const signals: ValidationSignal[] = [];
  if (!input.settings.enabled) {
    signals.push({ code: "DISABLED", message: "Smart attendance is disabled for this organization.", weight: "HIGH" });
  }
  if (!input.employeeActive || !input.membershipActive) {
    signals.push({ code: "INACTIVE", message: "Employee is not an active organization member.", weight: "HIGH" });
  }
  if (input.duplicate) {
    signals.push({ code: "DUPLICATE", message: "Idempotency key already accepted.", weight: "HIGH" });
  }
  if (input.settings.require_trusted_device && (!input.device || input.device.status !== "ACTIVE")) {
    signals.push({ code: "UNTRUSTED_DEVICE", message: "Attendance from an unauthorized device is rejected.", weight: "HIGH" });
  }
  if (!input.workplace || input.workplace.status !== "ACTIVE") {
    signals.push({ code: "NO_WORKPLACE", message: "No active workplace is assigned.", weight: "HIGH" });
  } else {
    const distance = haversineMeters(
      input.latitude,
      input.longitude,
      input.workplace.latitude,
      input.workplace.longitude
    );
    if (distance > input.workplace.radius_meters) {
      signals.push({
        code: "OUTSIDE_GEOFENCE",
        message: `Location is ${Math.round(distance)}m from workplace (radius ${input.workplace.radius_meters}m).`,
        weight: "HIGH",
      });
    }
  }
  if (input.accuracyMeters > input.settings.accuracy_threshold_meters) {
    signals.push({
      code: "ACCURACY",
      message: `Reported accuracy ${Math.round(input.accuracyMeters)}m exceeds ${input.settings.accuracy_threshold_meters}m.`,
      weight: "MEDIUM",
    });
  }
  const lagMs = eventFreshnessMs(input.occurredAt, input.receivedAt);
  if (lagMs > input.settings.freshness_seconds * 1000) {
    signals.push({
      code: "STALE",
      message: `Event is ${Math.round(lagMs / 1000)}s old; delayed geofence delivery requires extra checks.`,
      weight: "MEDIUM",
    });
  }
  if (lagMs < -30_000) {
    signals.push({ code: "FUTURE", message: "Event timestamp is in the future.", weight: "HIGH" });
  }
  const windowStart =
    input.requestedDirection === "OUT"
      ? input.settings.exit_window_start || input.settings.entry_window_start
      : input.settings.entry_window_start;
  const windowEnd =
    input.requestedDirection === "OUT"
      ? input.settings.exit_window_end || input.settings.entry_window_end
      : input.settings.entry_window_end;
  if (!inEntryWindow(input.occurredAt, windowStart, windowEnd, input.timeZone)) {
    signals.push({
      code: "WINDOW",
      message:
        input.requestedDirection === "OUT"
          ? "Event is outside the configured exit window."
          : "Event is outside the configured entry window.",
      weight: "MEDIUM",
    });
  }
  if (
    input.previousOccurredAt &&
    input.previousDirection === input.requestedDirection &&
    input.requestedDirection !== "UNKNOWN"
  ) {
    const intervalMs = Math.abs(input.occurredAt.getTime() - input.previousOccurredAt.getTime());
    const minMs = (input.settings.duplicate_interval_seconds || DEFAULT_SMART_SETTINGS.duplicateIntervalSeconds) * 1000;
    if (intervalMs < minMs) {
      signals.push({
        code: "DUPLICATE_INTERVAL",
        message: `Same-direction event within ${Math.round(minMs / 1000)}s is treated as a duplicate interval, not a second punch.`,
        weight: "HIGH",
      });
    }
  }
  if (input.mockLocation) {
    signals.push({
      code: "MOCK_LOCATION",
      message: "Mock-location indicator is a risk signal, not proof of fraud.",
      weight: "HIGH",
    });
  }
  if (input.integrityResult && input.integrityResult !== "PASS" && input.integrityResult !== "UNAVAILABLE") {
    signals.push({
      code: "INTEGRITY",
      message: `Play Integrity result ${input.integrityResult} is a risk signal.`,
      weight: "MEDIUM",
    });
  }
  if (
    input.previousDirection &&
    input.previousDirection === input.requestedDirection &&
    input.requestedDirection !== "UNKNOWN"
  ) {
    signals.push({
      code: "STATE",
      message: `Previous punch was already ${input.requestedDirection}.`,
      weight: "MEDIUM",
    });
  }

  const high = signals.filter((item) => item.weight === "HIGH");
  const medium = signals.filter((item) => item.weight === "MEDIUM");
  let risk: AttendanceRiskLevel = "LOW";
  for (const signal of signals) risk = worse(risk, signal.weight);
  const reasons = signals.map((item) => item.message);

  if (input.duplicate || signals.some((item) => item.code === "DUPLICATE_INTERVAL")) {
    return {
      status: "DUPLICATE",
      risk,
      reasons,
      signals,
      requiredVerification: "NONE",
      acceptToEngine: false,
    };
  }

  const fatal = high.some((item) =>
    ["DISABLED", "INACTIVE", "UNTRUSTED_DEVICE", "NO_WORKPLACE", "OUTSIDE_GEOFENCE", "FUTURE"].includes(item.code)
  );
  if (fatal) {
    return {
      status: "REJECTED",
      risk: "HIGH",
      reasons,
      signals,
      requiredVerification: "NONE",
      acceptToEngine: false,
    };
  }

  if (risk === "HIGH" || high.length > 0) {
    return {
      status: "PENDING_REVIEW",
      risk: "HIGH",
      reasons,
      signals,
      requiredVerification: "HR_REVIEW",
      acceptToEngine: false,
    };
  }

  if (risk === "MEDIUM" || medium.length > 0) {
    return {
      status: "PENDING_VERIFICATION",
      risk: "MEDIUM",
      reasons,
      signals,
      requiredVerification: input.settings.face_provider_configured ? "FACE_PROVIDER" : "DEVICE_BIOMETRIC",
      acceptToEngine: false,
    };
  }

  const policy: SmartAutoAcceptPolicy = input.settings.auto_accept_policy;
  if (policy === "OFF") {
    return {
      status: "PENDING_VERIFICATION",
      risk: "LOW",
      reasons: reasons.length ? reasons : ["Auto-accept is disabled."],
      signals,
      requiredVerification: "DEVICE_BIOMETRIC",
      acceptToEngine: false,
    };
  }

  return {
    status: "ACCEPTED",
    risk: "LOW",
    reasons: reasons.length ? reasons : ["All required evidence passed."],
    signals,
    requiredVerification: "NONE",
    acceptToEngine: true,
  };
}

export function canAutoAcceptAfterVerification(
  policy: SmartAutoAcceptPolicy,
  risk: AttendanceRiskLevel,
  outcome: "PASSED" | "FAILED" | "SKIPPED" | "UNAVAILABLE"
) {
  if (outcome !== "PASSED") return false;
  if (policy === "OFF") return false;
  if (risk === "HIGH") return false;
  if (risk === "MEDIUM") return policy === "LOW_AND_MEDIUM";
  return true;
}

export function qrExpired(expiresAt: Date, now: Date) {
  return now.getTime() > expiresAt.getTime();
}

export function defaultSettingsRow(
  organizationId: string,
  now: string
): Omit<SmartAttendanceSettings, "id"> & { id?: string } {
  return {
    organization_id: organizationId,
    enabled: DEFAULT_SMART_SETTINGS.enabled,
    geofence_radius_meters: DEFAULT_SMART_SETTINGS.geofenceRadiusMeters,
    accuracy_threshold_meters: DEFAULT_SMART_SETTINGS.accuracyThresholdMeters,
    freshness_seconds: DEFAULT_SMART_SETTINGS.freshnessSeconds,
    max_trusted_devices: DEFAULT_SMART_SETTINGS.maxTrustedDevices,
    require_trusted_device: DEFAULT_SMART_SETTINGS.requireTrustedDevice,
    require_precise_location: DEFAULT_SMART_SETTINGS.requirePreciseLocation,
    background_location_enabled: DEFAULT_SMART_SETTINGS.backgroundLocationEnabled,
    auto_accept_policy: DEFAULT_SMART_SETTINGS.autoAcceptPolicy,
    qr_fallback_enabled: DEFAULT_SMART_SETTINGS.qrFallbackEnabled,
    dynamic_pin_enabled: DEFAULT_SMART_SETTINGS.dynamicPinEnabled,
    qr_ttl_seconds: DEFAULT_SMART_SETTINGS.qrTtlSeconds,
    entry_window_start: DEFAULT_SMART_SETTINGS.entryWindowStart,
    entry_window_end: DEFAULT_SMART_SETTINGS.entryWindowEnd,
    exit_window_start: DEFAULT_SMART_SETTINGS.exitWindowStart,
    exit_window_end: DEFAULT_SMART_SETTINGS.exitWindowEnd,
    duplicate_interval_seconds: DEFAULT_SMART_SETTINGS.duplicateIntervalSeconds,
    face_provider_kind: DEFAULT_SMART_SETTINGS.faceProviderKind,
    face_provider_configured: false,
    retention_days: DEFAULT_SMART_SETTINGS.retentionDays,
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function summarizeEvents(rows: Array<{ status: SmartEventStatus; source: string }>) {
  return {
    total: rows.length,
    accepted: rows.filter((row) => row.status === "ACCEPTED").length,
    rejected: rows.filter((row) => row.status === "REJECTED").length,
    suspicious: rows.filter((row) => row.status === "FLAGGED" || row.status === "PENDING_REVIEW").length,
    pending: rows.filter((row) => row.status === "PENDING_VERIFICATION").length,
    qr: rows.filter((row) => row.source === "QR").length,
    locationFailures: rows.filter((row) => row.status === "REJECTED").length,
  };
}
