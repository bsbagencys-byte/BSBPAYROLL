import type { AdapterResult, NormalizedPunchInput } from "@/types";

export interface AdapterContext {
  contentType: string;
  headers: Record<string, string>;
  searchParams: URLSearchParams;
  timezone: string;
  rawBody: string;
}

export interface BiometricAdapter {
  vendor: "ESSL" | "GENERIC";
  canParse(payload: unknown, context: AdapterContext): boolean;
  parse(payload: unknown, context: AdapterContext): AdapterResult;
}

export function ok(events: NormalizedPunchInput[]): AdapterResult {
  return { ok: true, events };
}

export function fail(error: string): AdapterResult {
  return { ok: false, error };
}
