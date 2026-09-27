import { sha256 } from "@/lib/biometric/hash";
import { parseWithVendor } from "@/lib/biometric/adapters";
import type { AdapterContext } from "@/lib/biometric/adapters/types";
import {
  findActiveMapping,
  findDeviceByToken,
  findDuplicateNormalized,
  insertNormalizedEvent,
  insertPunch,
  insertRawEvent,
  touchDevice,
  updateNormalizedEvent,
  updateRawEvent,
} from "@/lib/biometric/repository";
import type { BiometricDevice, BiometricNormalizedEvent, BiometricRawEvent, AttendancePunch } from "@/types";
import type { BiometricSource } from "@/lib/constants";

export type IngestResult = {
  accepted: boolean;
  status: number;
  message: string;
  punches: number;
  unmapped: number;
  duplicates: number;
  rejected: number;
};

function headersRecord(headers: Headers) {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function extractToken(request: Request, searchParams: URLSearchParams) {
  const header =
    request.headers.get("x-device-token") ??
    request.headers.get("x-essl-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return (header || searchParams.get("token") || searchParams.get("key") || "").trim();
}

async function readPayload(request: Request) {
  const rawBody = await request.text();
  const contentType = request.headers.get("content-type") ?? "";
  let payload: unknown = rawBody;
  if (contentType.includes("json") || rawBody.trim().startsWith("{") || rawBody.trim().startsWith("[")) {
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = rawBody;
    }
  } else if (contentType.includes("x-www-form-urlencoded")) {
    payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
  return { rawBody, payload, contentType };
}

export async function ingestBiometricRequest(
  request: Request,
  source: BiometricSource,
  options?: { device?: BiometricDevice; organizationId?: string }
): Promise<IngestResult> {
  const url = new URL(request.url);
  const { rawBody, payload, contentType } = await readPayload(request);
  const token = extractToken(request, url.searchParams);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  const payloadHash = sha256(rawBody || JSON.stringify(payload ?? {}));

  const device = options?.device ?? (token ? await findDeviceByToken(sha256(token)) : null);
  if (!device) {
    await insertRawEvent({
      id: crypto.randomUUID(),
      organization_id: options?.organizationId ?? null,
      device_id: null,
      vendor: null,
      source,
      payload: typeof payload === "object" && payload ? (payload as Record<string, unknown>) : { raw: rawBody },
      payload_hash: payloadHash,
      received_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: userAgent,
      status: "REJECTED",
      error_message: "Unknown or missing device token.",
    });
    return { accepted: false, status: 401, message: "Unknown device token.", punches: 0, unmapped: 0, duplicates: 0, rejected: 1 };
  }

  if (device.status === "DISABLED") {
    return { accepted: false, status: 403, message: "Device is disabled.", punches: 0, unmapped: 0, duplicates: 0, rejected: 1 };
  }

  const raw: BiometricRawEvent = {
    id: crypto.randomUUID(),
    organization_id: device.organization_id,
    device_id: device.id,
    vendor: device.vendor,
    source,
    payload: typeof payload === "object" && payload ? (payload as Record<string, unknown>) : { raw: rawBody },
    payload_hash: payloadHash,
    received_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: userAgent,
    status: "RECEIVED",
    error_message: null,
  };
  await insertRawEvent(raw);

  const context: AdapterContext = {
    contentType,
    headers: headersRecord(request.headers),
    searchParams: url.searchParams,
    timezone: device.timezone,
    rawBody,
  };
  const parsed = parseWithVendor(device.vendor, payload, context);
  if (!parsed.ok) {
    await updateRawEvent(raw.id, { status: "REJECTED", error_message: parsed.error });
    await touchDevice(device.id, device.status === "PENDING" ? "ACTIVE" : device.status, parsed.error);
    return { accepted: false, status: 400, message: parsed.error, punches: 0, unmapped: 0, duplicates: 0, rejected: 1 };
  }

  let punches = 0;
  let unmapped = 0;
  let duplicates = 0;
  let rejected = 0;
  let lastStatus: BiometricRawEvent["status"] = "NORMALIZED";

  for (const event of parsed.events) {
    const punchedAt = event.punchedAt.toISOString();
    const duplicate = await findDuplicateNormalized(device.id, event.deviceUserId, punchedAt);
    if (duplicate) {
      duplicates += 1;
      lastStatus = "DUPLICATE";
      continue;
    }

    const normalized: BiometricNormalizedEvent = {
      id: crypto.randomUUID(),
      organization_id: device.organization_id,
      device_id: device.id,
      raw_event_id: raw.id,
      vendor: event.vendor,
      device_user_id: event.deviceUserId,
      punched_at: punchedAt,
      punched_at_local: event.punchedAtLocal,
      timezone: event.timezone,
      direction: event.direction,
      verification_mode: event.verificationMode,
      work_code: event.workCode,
      payload_hash: payloadHash,
      status: "NORMALIZED",
      created_at: new Date().toISOString(),
    };
    const saved = await insertNormalizedEvent(normalized);
    if (!saved) {
      duplicates += 1;
      lastStatus = "DUPLICATE";
      continue;
    }

    const mapping = await findActiveMapping(device.id, event.deviceUserId);
    if (!mapping) {
      await updateNormalizedEvent(saved.id, "UNMAPPED");
      unmapped += 1;
      lastStatus = "UNMAPPED";
      continue;
    }

    const punch: AttendancePunch = {
      id: crypto.randomUUID(),
      organization_id: device.organization_id,
      employee_id: mapping.employee_id,
      device_id: device.id,
      normalized_event_id: saved.id,
      punched_at: punchedAt,
      punched_at_local: event.punchedAtLocal,
      timezone: event.timezone,
      direction: event.direction,
      verification_mode: event.verificationMode,
      source,
      created_at: new Date().toISOString(),
    };
    const written = await insertPunch(punch);
    if (!written) {
      duplicates += 1;
      await updateNormalizedEvent(saved.id, "DUPLICATE");
      lastStatus = "DUPLICATE";
      continue;
    }
    await updateNormalizedEvent(saved.id, "MAPPED");
    punches += 1;
    lastStatus = "MAPPED";
  }

  if (!parsed.events.length) rejected += 1;
  await updateRawEvent(raw.id, {
    status: lastStatus,
    error_message: unmapped ? "One or more punches are unmapped." : null,
  });
  await touchDevice(device.id, "ACTIVE", unmapped ? "Unmapped device user" : null);

  return {
    accepted: true,
    status: 200,
    message: punches || unmapped || duplicates ? "ok" : "accepted",
    punches,
    unmapped,
    duplicates,
    rejected,
  };
}
