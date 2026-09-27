import type { PunchDirection, VerificationMode } from "@/lib/constants";
import { PUNCH_DIRECTIONS, VERIFICATION_MODES } from "@/lib/constants";
import { parsePunchTime, formatLocalDateTime } from "@/lib/biometric/time";
import { fail, ok, type AdapterContext, type BiometricAdapter } from "@/lib/biometric/adapters/types";
import type { NormalizedPunchInput } from "@/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const match = Object.keys(record).find((item) => item.toLowerCase() === key.toLowerCase());
    if (match && record[match] !== undefined && record[match] !== null && record[match] !== "") {
      return record[match];
    }
  }
  return undefined;
}

function directionOf(value: unknown): PunchDirection {
  const text = String(value ?? "UNKNOWN").trim().toUpperCase();
  return (PUNCH_DIRECTIONS as readonly string[]).includes(text) ? (text as PunchDirection) : "UNKNOWN";
}

function verifyOf(value: unknown): VerificationMode {
  const text = String(value ?? "UNKNOWN").trim().toUpperCase();
  return (VERIFICATION_MODES as readonly string[]).includes(text) ? (text as VerificationMode) : "OTHER";
}

function eventFromRecord(record: Record<string, unknown>, timezone: string): NormalizedPunchInput | null {
  const deviceUserId = String(pick(record, ["deviceUserId", "userId", "pin", "enrollId", "id"]) ?? "").trim();
  const punched = parsePunchTime(pick(record, ["punchedAt", "timestamp", "dateTime", "time"]), timezone);
  if (!deviceUserId || !punched) return null;
  return {
    vendor: "GENERIC",
    deviceSerial: String(pick(record, ["serialNumber", "serial", "SN"]) ?? "").trim() || null,
    deviceUserId,
    punchedAt: punched,
    punchedAtLocal: formatLocalDateTime(punched, timezone),
    timezone,
    direction: directionOf(pick(record, ["direction", "inOut", "status"])),
    verificationMode: verifyOf(pick(record, ["verificationMode", "verify"])),
    workCode: pick(record, ["workCode"]) != null ? String(pick(record, ["workCode"])) : null,
  };
}

export const genericAdapter: BiometricAdapter = {
  vendor: "GENERIC",
  canParse(payload) {
    const record = asRecord(payload);
    if (Array.isArray(payload)) return true;
    if (!record) return false;
    return Boolean(pick(record, ["deviceUserId", "events", "punches"]) || pick(record, ["userId"]));
  },
  parse(payload, context: AdapterContext) {
    const record = asRecord(payload);
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(record?.events)
        ? record!.events
        : Array.isArray(record?.punches)
          ? record!.punches
          : record
            ? [record]
            : [];
    const events: NormalizedPunchInput[] = [];
    for (const item of list) {
      const row = asRecord(item);
      if (!row) continue;
      const event = eventFromRecord(row, context.timezone);
      if (event) events.push(event);
    }
    if (!events.length) return fail("No generic punch records found in payload.");
    return ok(events);
  },
};
