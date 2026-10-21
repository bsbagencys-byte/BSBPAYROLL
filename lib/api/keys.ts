import { randomBytes } from "node:crypto";
import { API_SCOPES, type ApiScope } from "@/lib/constants";
import { sha256, tokenHint } from "@/lib/biometric/hash";
import { getApiKeyByHash, listApiKeys, listApiRequestLogs, upsertApiKey } from "@/lib/events/repository";
import type { ApiKey } from "@/types";

function stamp() {
  return new Date().toISOString();
}

export function generateApiKey() {
  return `bsb_live_${randomBytes(24).toString("hex")}`;
}

export function parseScopes(raw: string): ApiScope[] {
  try {
    const value = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ApiScope => (API_SCOPES as readonly string[]).includes(String(item)));
  } catch {
    return [];
  }
}

export async function createApiKey(input: {
  organizationId: string;
  name: string;
  scopes: string[];
  expiresAt?: string | null;
  rateLimitPerMinute?: number;
  actorId: string | null;
}) {
  const scopes = input.scopes.filter((item) => (API_SCOPES as readonly string[]).includes(item));
  if (!scopes.length) throw new Error("Select at least one API scope.");
  const plaintext = generateApiKey();
  const row: ApiKey = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    name: input.name,
    key_prefix: plaintext.slice(0, 12),
    key_hash: sha256(plaintext),
    scopes_json: JSON.stringify(scopes),
    status: "ACTIVE",
    expires_at: input.expiresAt || null,
    last_used_at: null,
    rate_limit_per_minute: Math.max(10, Math.min(600, input.rateLimitPerMinute ?? 60)),
    created_by: input.actorId,
    revoked_by: null,
    revoked_at: null,
    created_at: stamp(),
    updated_at: stamp(),
  };
  const saved = await upsertApiKey(row);
  return { key: saved, plaintext };
}

export async function revokeApiKey(organizationId: string, id: string, actorId: string | null) {
  const keys = await listApiKeys(organizationId);
  const existing = keys.find((item) => item.id === id);
  if (!existing) throw new Error("API key not found.");
  return upsertApiKey({
    ...existing,
    status: "REVOKED",
    revoked_by: actorId,
    revoked_at: stamp(),
    updated_at: stamp(),
  });
}

export async function rotateApiKey(organizationId: string, id: string, actorId: string | null) {
  const keys = await listApiKeys(organizationId);
  const existing = keys.find((item) => item.id === id);
  if (!existing) throw new Error("API key not found.");
  await revokeApiKey(organizationId, id, actorId);
  return createApiKey({
    organizationId,
    name: existing.name,
    scopes: parseScopes(existing.scopes_json),
    expiresAt: existing.expires_at,
    rateLimitPerMinute: existing.rate_limit_per_minute,
    actorId,
  });
}

export async function authenticateApiKey(plaintext: string) {
  if (!plaintext) return null;
  const row = await getApiKeyByHash(sha256(plaintext));
  if (!row || row.status !== "ACTIVE") return null;
  if (row.expires_at && row.expires_at < stamp()) {
    await upsertApiKey({ ...row, status: "EXPIRED", updated_at: stamp() });
    return null;
  }
  await upsertApiKey({ ...row, last_used_at: stamp(), updated_at: stamp() });
  return row;
}

export function hasScope(key: ApiKey, scope: ApiScope) {
  return parseScopes(key.scopes_json).includes(scope);
}

export { listApiKeys, listApiRequestLogs, tokenHint };
