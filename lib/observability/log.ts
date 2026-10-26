const REDACT = /secret|password|token|authorization|cookie|apikey|api_key|service_role|private/i;

function sanitize(value: unknown, key = ""): unknown {
  if (REDACT.test(key)) return "[redacted]";
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitize(v, k);
    }
    return out;
  }
  return value;
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {}
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...((sanitize(fields) as Record<string, unknown>) ?? {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logInfo(event: string, fields?: Record<string, unknown>) {
  logEvent("info", event, fields);
}

export function logWarn(event: string, fields?: Record<string, unknown>) {
  logEvent("warn", event, fields);
}

export function logError(event: string, fields?: Record<string, unknown>) {
  logEvent("error", event, fields);
}
