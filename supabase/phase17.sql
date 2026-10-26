-- BSB Payroll Phase 17 overlay (production readiness). Additive only.
-- Safe to re-run. Does not drop tenant data.

alter table public.webhook_endpoints
  add column if not exists secret_encrypted text;

comment on column public.webhook_endpoints.secret_encrypted is
  'AES-256-GCM ciphertext of the webhook signing secret. Null until SESSION_SECRET is configured and the secret is rotated.';
