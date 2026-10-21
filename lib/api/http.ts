import { authenticateApiKey, hasScope } from "@/lib/api/keys";
import { insertApiRequestLog } from "@/lib/events/repository";
import { checkApiRateLimit } from "@/lib/rate-limit";
import type { ApiScope } from "@/lib/constants";
import type { ApiKey } from "@/types";

export type ApiContext = {
  requestId: string;
  key: ApiKey;
  organizationId: string;
};

function json(body: unknown, status: number, requestId: string, extra?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "x-request-id": requestId,
      ...extra,
    },
  });
}

export function apiError(requestId: string, status: number, code: string, message: string) {
  return json({ error: { code, message, request_id: requestId } }, status, requestId);
}

export async function requireApiKey(request: Request, scope: ApiScope): Promise<
  { ok: true; ctx: ApiContext } | { ok: false; response: Response }
> {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const header = request.headers.get("authorization") ?? request.headers.get("x-api-key") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const path = new URL(request.url).pathname;
  if (!token) {
    return { ok: false, response: apiError(requestId, 401, "unauthorized", "API key required.") };
  }
  const key = await authenticateApiKey(token);
  if (!key) {
    await insertApiRequestLog({
      id: crypto.randomUUID(),
      organization_id: null,
      api_key_id: null,
      request_id: requestId,
      method: request.method,
      path,
      status_code: 401,
      ip_address: ip,
      user_agent: request.headers.get("user-agent"),
      error_code: "unauthorized",
      created_at: new Date().toISOString(),
    });
    return { ok: false, response: apiError(requestId, 401, "unauthorized", "Invalid or revoked API key.") };
  }
  const limit = checkApiRateLimit(`api:${key.id}`, key.rate_limit_per_minute);
  if (!limit.allowed) {
    await insertApiRequestLog({
      id: crypto.randomUUID(),
      organization_id: key.organization_id,
      api_key_id: key.id,
      request_id: requestId,
      method: request.method,
      path,
      status_code: 429,
      ip_address: ip,
      user_agent: request.headers.get("user-agent"),
      error_code: "rate_limited",
      created_at: new Date().toISOString(),
    });
    return {
      ok: false,
      response: apiError(requestId, 429, "rate_limited", "Too many requests."),
    };
  }
  if (!hasScope(key, scope)) {
    await insertApiRequestLog({
      id: crypto.randomUUID(),
      organization_id: key.organization_id,
      api_key_id: key.id,
      request_id: requestId,
      method: request.method,
      path,
      status_code: 403,
      ip_address: ip,
      user_agent: request.headers.get("user-agent"),
      error_code: "forbidden",
      created_at: new Date().toISOString(),
    });
    return { ok: false, response: apiError(requestId, 403, "forbidden", "API key is missing the required scope.") };
  }
  return { ok: true, ctx: { requestId, key, organizationId: key.organization_id } };
}

export async function apiOk(ctx: ApiContext, request: Request, body: unknown, status = 200) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await insertApiRequestLog({
    id: crypto.randomUUID(),
    organization_id: ctx.organizationId,
    api_key_id: ctx.key.id,
    request_id: ctx.requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    status_code: status,
    ip_address: ip,
    user_agent: request.headers.get("user-agent"),
    error_code: null,
    created_at: new Date().toISOString(),
  });
  return json(body, status, ctx.requestId);
}

export function pageParams(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? "20") || 20));
  return { page, perPage, offset: (page - 1) * perPage };
}
