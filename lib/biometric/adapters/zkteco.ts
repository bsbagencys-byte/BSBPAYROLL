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
  if (["IN", "CHECK-IN", "CHECKIN", "0", "I"].includes(text)) return "IN";
  if (["OUT", "CHECK-OUT", "CHECKOUT", "1", "O"].includes(text)) return "OUT";
  const num = Number(text);
  if (num === 0 || num === 2 || num === 4) return "IN";
  if (num === 1 || num === 3 || num === 5) return "OUT";
  return "UNKNOWN";
}

function mapVerify(value: unknown): VerificationMode {
  const text = String(value ?? "").trim().toUpperCase();
  if (["FINGER", "FINGERPRINT", "FP", "1", "0"].includes(text)) return "FINGER";
  if (["FACE", "FACIAL", "15"].includes(text)) return "OTHER";
  if (["PIN", "2"].includes(text)) return "PIN";
  if (["PASSWORD", "PASS", "3"].includes(text)) return "PASSWORD";
  if (["CARD", "RFID", "4"].includes(text)) return "CARD";
  if (!text || text === "UNKNOWN") return "UNKNOWN";
  return "OTHER";
}

function eventFromRecord(record: Record<string, unknown>, timezone: string, serialFallback: string | null): NormalizedPunchInput | null {
  const deviceUserId = String(
    pick(record, ["pin", "PIN", "user_id", "userId", "employee_code", "enrollId", "UserID"]) ?? ""
  ).trim();
  const punched = parsePunchTime(
    pick(record, ["timestamp", "punch_time", "DateTime", "time", "log_time", "attTime"]),
    timezone
  );
  if (!deviceUserId || !punched) return null;
  return {
    vendor: "ZKTECO",
    deviceSerial: String(pick(record, ["sn", "SN", "serial_number", "device_sn"]) ?? serialFallback ?? "").trim() || null,
    deviceUserId,
    punchedAt: punched,
    punchedAtLocal: formatLocalDateTime(punched, timezone),
    timezone,
    direction: mapDirection(pick(record, ["state", "punch_state", "InOutMode", "status", "direction"])),
    verificationMode: mapVerify(pick(record, ["verify", "verify_type", "VerifyType", "verificationMode"])),
    workCode: pick(record, ["workcode", "WorkCode"]) != null ? String(pick(record, ["workcode", "WorkCode"])) : null,
  };
}

function parseAttLog(body: string, timezone: string, serial: string | null): NormalizedPunchInput[] {
  const events: NormalizedPunchInput[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("<") || trimmed.startsWith("{")) continue;
    const parts = trimmed.split(/\t|,/);
    if (parts.length < 2) continue;
    const event = eventFromRecord(
      { PIN: parts[0], DateTime: parts[1], Status: parts[2], Verified: parts[3], WorkCode: parts[4] },
      timezone,
      serial
    );
    if (event) events.push(event);
  }
  return events;
}

export const zktecoAdapter: BiometricAdapter = {
  vendor: "ZKTECO",
  canParse(payload, context: AdapterContext) {
    const raw = context.rawBody.trim();
    if (raw.includes("ZKTECO") || context.searchParams.get("vendor") === "ZKTECO") return true;
    const record = asRecord(payload);
    if (!record) return typeof payload === "string" && payload.includes("\t");
    return Boolean(pick(record, ["sn", "SN", "punch_state", "attTime", "transactions"]));
  },
  parse(payload, context) {
    const fromQuery = context.searchParams.get("SN");
    const fromPayload = asRecord(payload) ? String(pick(asRecord(payload)!, ["SN", "sn", "serial_number"]) ?? "") : "";
    const serial = (fromQuery || fromPayload || "").trim() || null;
    const raw = context.rawBody.trim();
    let events: NormalizedPunchInput[] = [];
    if (raw && !raw.startsWith("{") && !raw.startsWith("[")) {
      events = parseAttLog(raw, context.timezone, serial);
    } else {
      const record = asRecord(payload);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(record?.transactions)
          ? record!.transactions
          : Array.isArray(record?.data)
            ? record!.data
            : Array.isArray(record?.records)
              ? record!.records
              : record
                ? [record]
                : [];
      for (const item of list) {
        const row = asRecord(item);
        if (!row) continue;
        const event = eventFromRecord(row, context.timezone, serial);
        if (event) events.push(event);
      }
      if (!events.length && raw) events = parseAttLog(raw, context.timezone, serial);
    }
    if (!events.length) return fail("No ZKTeco punch records found in payload.");
    return ok(events);
  },
};
