import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { appendAudit } from "@/lib/demo-store";
import { headers } from "next/headers";

export async function writeAudit(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent") ?? null;

  if (!hasSupabaseConfig() || isDemoMode()) {
    appendAudit({
      organization_id: input.organizationId ?? null,
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
      ip_address: ip,
      user_agent: userAgent,
    });
    return;
  }

  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("audit_logs").insert({
    organization_id: input.organizationId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip_address: ip,
    user_agent: userAgent,
  });
}
