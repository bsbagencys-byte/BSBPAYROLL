import type { PunchDirection, VerificationMode } from "@/lib/constants";
import { parsePunchTime, formatLocalDateTime } from "@/lib/biometric/time";
import { fail, ok, type BiometricAdapter } from "@/lib/biometric/adapters/types";
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
  if (["PIN", "2"].includes(text)) return "PIN";
  if (["PASSWORD", "PASS", "3"].includes(text)) return "PASSWORD";
  if (["CARD", "RFID", "4"].includes(text)) return "CARD";
  if (!text || text === "UNKNOWN") return "UNKNOWN";
  return "OTHER";
}

function eventFromRecord(record: Record<string, unknown>, timezone: string, serialFallback: string | null): NormalizedPunchInput | null {
  const deviceUserId = String(
    pick(record, ["PIN", "pin", "userId", "UserID", "deviceUserId", "enrollId", "EnrollNumber", "id"]) ?? ""
  ).trim();
  const punched = parsePunchTime(
    pick(record, ["DateTime", "dateTime", "timestamp", "punchedAt", "time", "TTime", "LogTime"]),
    timezone
  );
  if (!deviceUserId || !punched) return null;
  return {
    vendor: "ESSL",
    deviceSerial: String(pick(record, ["SN", "serialNumber", "serial", "DeviceSerial"]) ?? serialFallback ?? "").trim() || null,
    deviceUserId,
    punchedAt: punched,
    punchedAtLocal: formatLocalDateTime(punched, timezone),
    timezone,
    direction: mapDirection(pick(record, ["Status", "status", "InOutMode", "inOut", "direction", "punchState"])),
    verificationMode: mapVerify(pick(record, ["Verified", "Verify", "verify", "verificationMode", "VerifyType"])),
    workCode: pick(record, ["WorkCode", "workCode", "work_code"]) != null
      ? String(pick(record, ["WorkCode", "workCode", "work_code"]))
      : null,
  };
}

function parseAttLog(body: string, timezone: string, serial: string | null): NormalizedPunchInput[] {
  const events: NormalizedPunchInput[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("<") || trimmed.startsWith("{")) continue;
    const parts = trimmed.split(/\t|,/);
    if (parts.length < 2) continue;
    const record = {
      PIN: parts[0],
      DateTime: parts[1],
      Status: parts[2],
      Verified: parts[3],
      WorkCode: parts[4],
    };
    const event = eventFromRecord(record, timezone, serial);
    if (event) events.push(event);
  }
  return events;
}

function parseXml(body: string, timezone: string, serial: string | null): NormalizedPunchInput[] {
  const events: NormalizedPunchInput[] = [];
  const blocks = body.match(/<(Row|record|ATTLOG|punch)[^>]*>[\s\S]*?<\/\1>/gi) ?? [body];
  for (const block of blocks) {
    const grab = (tag: string) => block.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"))?.[1];
    const record = {
      PIN: grab("PIN") ?? grab("UserID") ?? grab("EnrollNumber"),
      DateTime: grab("DateTime") ?? grab("LogTime") ?? grab("Time"),
      Status: grab("Status") ?? grab("InOutMode"),
      Verified: grab("Verified") ?? grab("VerifyType"),
      WorkCode: grab("WorkCode"),
      SN: grab("SN") ?? serial,
    };
    const event = eventFromRecord(record, timezone, serial);
    if (event) events.push(event);
  }
  return events;
}

export const esslAdapter: BiometricAdapter = {
  vendor: "ESSL",
  canParse(payload, context) {
    const raw = context.rawBody.trim();
    if (raw.includes("ATTLOG") || /PIN\t\d{4}-\d{2}-\d{2}/.test(raw)) return true;
    const record = asRecord(payload);
    if (!record) return typeof payload === "string" && payload.includes("\t");
    return Boolean(
      pick(record, ["PIN", "SN", "table", "ATTLOG", "records", "RealTime"]) ||
        context.searchParams.get("SN") ||
        context.searchParams.get("table") === "ATTLOG"
    );
  },
  parse(payload, context) {
    const fromQuery = context.searchParams.get("SN");
    const fromPayload = asRecord(payload)
      ? String(pick(asRecord(payload)!, ["SN", "serialNumber", "serial"]) ?? "")
      : "";
    const serial = (fromQuery || fromPayload || "").trim() || null;
    const raw = context.rawBody.trim();
    let events: NormalizedPunchInput[] = [];

    if (raw.startsWith("<") || context.contentType.includes("xml")) {
      events = parseXml(raw, context.timezone, serial);
    } else if (raw && !raw.startsWith("{") && !raw.startsWith("[")) {
      events = parseAttLog(raw, context.timezone, serial);
    } else {
      const record = asRecord(payload);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(record?.records)
          ? record!.records
          : Array.isArray(record?.data)
            ? record!.data
            : Array.isArray(record?.RealTime)
              ? record!.RealTime
              : record
                ? [record]
                : [];
      for (const item of list) {
        const row = asRecord(item);
        if (!row) continue;
        const event = eventFromRecord(row, context.timezone, serial);
        if (event) events.push(event);
      }
      if (events.length === 0 && raw) events = parseAttLog(raw, context.timezone, serial);
    }

    if (!events.length) return fail("No eSSL punch records found in payload.");
    return ok(events);
  },
};
