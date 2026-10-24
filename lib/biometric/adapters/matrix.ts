import type { PunchDirection, VerificationMode } from "@/lib/constants";
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

function mapDirection(value: unknown): PunchDirection {
  const text = String(value ?? "").trim().toUpperCase();
  if (["IN", "ENTRY", "CHECK-IN", "0"].includes(text)) return "IN";
  if (["OUT", "EXIT", "CHECK-OUT", "1"].includes(text)) return "OUT";
  return "UNKNOWN";
}

function mapVerify(value: unknown): VerificationMode {
  const text = String(value ?? "").trim().toUpperCase();
  if (["FINGER", "FINGERPRINT", "FP"].includes(text)) return "FINGER";
  if (["CARD", "RFID", "PROXIMITY"].includes(text)) return "CARD";
  if (["PIN"].includes(text)) return "PIN";
  if (["PASSWORD"].includes(text)) return "PASSWORD";
  if (!text) return "UNKNOWN";
  return "OTHER";
}

function eventFromRecord(record: Record<string, unknown>, timezone: string, serialFallback: string | null): NormalizedPunchInput | null {
  const deviceUserId = String(
    pick(record, ["EmpCode", "empCode", "userId", "UserCode", "employeeCode", "pin"]) ?? ""
  ).trim();
  const punched = parsePunchTime(
    pick(record, ["PunchDateTime", "punchDateTime", "LogDateTime", "timestamp", "EventTime"]),
    timezone
  );
  if (!deviceUserId || !punched) return null;
  return {
    vendor: "MATRIX",
    deviceSerial: String(pick(record, ["DeviceId", "deviceId", "ControllerId", "serialNumber"]) ?? serialFallback ?? "").trim() || null,
    deviceUserId,
    punchedAt: punched,
    punchedAtLocal: formatLocalDateTime(punched, timezone),
    timezone,
    direction: mapDirection(pick(record, ["PunchType", "punchType", "Direction", "InOut"])),
    verificationMode: mapVerify(pick(record, ["AuthMode", "authMode", "VerificationMode"])),
    workCode: pick(record, ["WorkCode"]) != null ? String(pick(record, ["WorkCode"])) : null,
  };
}

export const matrixAdapter: BiometricAdapter = {
  vendor: "MATRIX",
  canParse(payload, context: AdapterContext) {
    if (context.searchParams.get("vendor") === "MATRIX") return true;
    const record = asRecord(payload);
    if (!record) return false;
    return Boolean(
      pick(record, ["EmpCode", "PunchDateTime", "ControllerId", "EventTime", "AttendanceLogs", "punchlogs"])
    );
  },
  parse(payload, context) {
    const record = asRecord(payload);
    const serial = record ? String(pick(record, ["DeviceId", "ControllerId", "serialNumber"]) ?? "").trim() || null : null;
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(record?.AttendanceLogs)
        ? record!.AttendanceLogs
        : Array.isArray(record?.punchlogs)
          ? record!.punchlogs
          : Array.isArray(record?.data)
            ? record!.data
            : record
              ? [record]
              : [];
    const events: NormalizedPunchInput[] = [];
    for (const item of list) {
      const row = asRecord(item);
      if (!row) continue;
      const event = eventFromRecord(row, context.timezone, serial);
      if (event) events.push(event);
    }
    if (!events.length) return fail("No Matrix COSEC punch records found in payload.");
    return ok(events);
  },
};
