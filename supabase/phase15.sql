-- BSB Payroll Phase 15 — Automation, notifications, scheduled jobs, APIs and webhooks
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–14 modules.
-- No Phase 4 attendance engine. External email/webhooks never report success unless a provider actually delivers.

alter table if exists public.ess_notifications
  add column if not exists event_type text;
alter table if exists public.ess_notifications
  add column if not exists delivery_status text not null default 'IN_APP';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ess_notifications_delivery_status_check'
  ) then
    alter table public.ess_notifications
      add constraint ess_notifications_delivery_status_check
      check (delivery_status in ('IN_APP', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED'));
  end if;
end $$;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  event_type text not null,
  in_app boolean not null default true,
  email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, event_type)
);

create index if not exists notification_preferences_user_idx
  on public.notification_preferences (organization_id, user_id);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null,
  name text not null,
  event_type text not null,
  channel text not null default 'EMAIL' check (channel in ('EMAIL', 'IN_APP')),
  language text not null default 'en',
  subject text not null,
  body_text text not null,
  body_html text,
  variables_json text not null default '[]',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key, language)
);

create index if not exists notification_templates_org_idx
  on public.notification_templates (organization_id, event_type, status);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  notification_id uuid references public.ess_notifications (id) on delete set null,
  template_id uuid references public.notification_templates (id) on delete set null,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  channel text not null check (channel in ('IN_APP', 'EMAIL')),
  event_type text not null,
  to_address text,
  subject text,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'SENT', 'FAILED', 'SKIPPED', 'UNCONFIGURED')),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  provider text,
  error_message text,
  event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_deliveries_org_idx
  on public.notification_deliveries (organization_id, status, created_at desc);
create index if not exists notification_deliveries_retry_idx
  on public.notification_deliveries (status, next_attempt_at);

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  version integer not null default 1,
  entity_type text,
  entity_id uuid,
  actor_id uuid references public.user_profiles (id) on delete set null,
  idempotency_key text,
  payload_json text not null default '{}',
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists domain_events_idempotency_uidx
  on public.domain_events (organization_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists domain_events_outbox_idx
  on public.domain_events (status, available_at, created_at);
create index if not exists domain_events_org_idx
  on public.domain_events (organization_id, event_type, created_at desc);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  trigger_type text not null,
  conditions_json text not null default '[]',
  actions_json text not null default '[]',
  enabled boolean not null default true,
  stop_on_match boolean not null default false,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_rules_org_idx
  on public.automation_rules (organization_id, enabled, trigger_type);

create table if not exists public.automation_rule_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  rule_id uuid not null references public.automation_rules (id) on delete cascade,
  event_id uuid not null references public.domain_events (id) on delete cascade,
  status text not null default 'APPLIED' check (status in ('APPLIED', 'SKIPPED', 'FAILED')),
  result_json text,
  created_at timestamptz not null default now(),
  unique (rule_id, event_id)
);

create table if not exists public.automation_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  body text,
  href text,
  assignee_user_id uuid references public.user_profiles (id) on delete set null,
  event_type text,
  entity_type text,
  entity_id uuid,
  status text not null default 'OPEN' check (status in ('OPEN', 'DONE', 'CANCELLED')),
  due_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_tasks_org_idx
  on public.automation_tasks (organization_id, status, due_at);

create table if not exists public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null,
  name text not null,
  cron_expr text,
  timezone text not null default 'Asia/Kolkata',
  payload_json text not null default '{}',
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_status text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_jobs_due_idx
  on public.scheduled_jobs (enabled, next_run_at)
  where enabled = true;

create table if not exists public.job_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_id uuid not null references public.scheduled_jobs (id) on delete cascade,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  attempt_count integer not null default 0,
  scheduled_for timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  result_json text,
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists job_executions_claim_uidx
  on public.job_executions (job_id, scheduled_for);
create index if not exists job_executions_org_idx
  on public.job_executions (organization_id, status, created_at desc);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  url text not null,
  secret_hash text not null,
  secret_hint text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  event_types_json text not null default '[]',
  created_by uuid references public.user_profiles (id) on delete set null,
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_endpoints_org_idx
  on public.webhook_endpoints (organization_id, status);

create table if not exists public.webhook_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event_id uuid not null references public.domain_events (id) on delete cascade,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'DELIVERED', 'FAILED', 'DEAD', 'BLOCKED')),
  attempt_count integer not null default 0,
  http_status integer,
  response_excerpt text,
  error_message text,
  signature_timestamp text,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists webhook_delivery_event_endpoint_uidx
  on public.webhook_delivery_attempts (endpoint_id, event_id);
create index if not exists webhook_delivery_retry_idx
  on public.webhook_delivery_attempts (status, next_attempt_at);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes_json text not null default '[]',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED', 'EXPIRED')),
  expires_at timestamptz,
  last_used_at timestamptz,
  rate_limit_per_minute integer not null default 60,
  created_by uuid references public.user_profiles (id) on delete set null,
  revoked_by uuid references public.user_profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_keys_org_idx
  on public.api_keys (organization_id, status);

create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  api_key_id uuid references public.api_keys (id) on delete set null,
  request_id text not null,
  method text not null,
  path text not null,
  status_code integer not null,
  ip_address text,
  user_agent text,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists api_request_logs_org_idx
  on public.api_request_logs (organization_id, created_at desc);

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();
drop trigger if exists notification_templates_updated_at on public.notification_templates;
create trigger notification_templates_updated_at before update on public.notification_templates
  for each row execute function public.set_updated_at();
drop trigger if exists notification_deliveries_updated_at on public.notification_deliveries;
create trigger notification_deliveries_updated_at before update on public.notification_deliveries
  for each row execute function public.set_updated_at();
drop trigger if exists automation_rules_updated_at on public.automation_rules;
create trigger automation_rules_updated_at before update on public.automation_rules
  for each row execute function public.set_updated_at();
drop trigger if exists automation_tasks_updated_at on public.automation_tasks;
create trigger automation_tasks_updated_at before update on public.automation_tasks
  for each row execute function public.set_updated_at();
drop trigger if exists scheduled_jobs_updated_at on public.scheduled_jobs;
create trigger scheduled_jobs_updated_at before update on public.scheduled_jobs
  for each row execute function public.set_updated_at();
drop trigger if exists webhook_endpoints_updated_at on public.webhook_endpoints;
create trigger webhook_endpoints_updated_at before update on public.webhook_endpoints
  for each row execute function public.set_updated_at();
drop trigger if exists webhook_delivery_attempts_updated_at on public.webhook_delivery_attempts;
create trigger webhook_delivery_attempts_updated_at before update on public.webhook_delivery_attempts
  for each row execute function public.set_updated_at();
drop trigger if exists api_keys_updated_at on public.api_keys;
create trigger api_keys_updated_at before update on public.api_keys
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('notifications.view', 'View own notifications', 'Notifications'),
  ('notifications.manage', 'Manage notification templates and preferences', 'Notifications'),
  ('automation.view', 'View automation rules and jobs', 'Automation'),
  ('automation.manage', 'Manage automation rules', 'Automation'),
  ('automation.jobs.view', 'View scheduled job executions', 'Automation'),
  ('automation.jobs.retry', 'Retry or cancel scheduled jobs', 'Automation'),
  ('developers.view', 'View developer settings', 'Developers'),
  ('developers.webhooks.manage', 'Manage webhook endpoints', 'Developers'),
  ('developers.webhooks.replay', 'Replay webhook deliveries', 'Developers'),
  ('developers.api_keys.manage', 'Manage API keys', 'Developers'),
  ('developers.logs.view', 'View API and webhook logs', 'Developers')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name in ('Notifications', 'Automation', 'Developers')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'notifications.view', 'notifications.manage', 'automation.view', 'automation.manage', 'automation.jobs.view'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'notifications.view', 'automation.view', 'automation.jobs.view'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('notifications.view')
where r.organization_id is null and r.code in ('ACCOUNTANT', 'MANAGER', 'EMPLOYEE')
on conflict (role_id, permission_id) do nothing;

alter table public.notification_preferences enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.domain_events enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_rule_runs enable row level security;
alter table public.automation_tasks enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.job_executions enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_delivery_attempts enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_request_logs enable row level security;

drop policy if exists notification_preferences_select on public.notification_preferences;
create policy notification_preferences_select on public.notification_preferences
  for select using (
    organization_id in (select public.current_org_ids())
    and (user_id = public.current_profile_id() or public.has_org_permission(organization_id, 'notifications.manage'))
  );
drop policy if exists notification_preferences_write on public.notification_preferences;
create policy notification_preferences_write on public.notification_preferences
  for all using (
    organization_id in (select public.current_org_ids())
    and (user_id = public.current_profile_id() or public.has_org_permission(organization_id, 'notifications.manage'))
  )
  with check (
    organization_id in (select public.current_org_ids())
    and (user_id = public.current_profile_id() or public.has_org_permission(organization_id, 'notifications.manage'))
  );

drop policy if exists notification_templates_select on public.notification_templates;
create policy notification_templates_select on public.notification_templates
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'notifications.manage')
  );
drop policy if exists notification_templates_write on public.notification_templates;
create policy notification_templates_write on public.notification_templates
  for all using (public.has_org_permission(organization_id, 'notifications.manage'))
  with check (public.has_org_permission(organization_id, 'notifications.manage'));

drop policy if exists notification_deliveries_select on public.notification_deliveries;
create policy notification_deliveries_select on public.notification_deliveries
  for select using (
    organization_id in (select public.current_org_ids())
    and (user_id = public.current_profile_id() or public.has_org_permission(organization_id, 'notifications.manage'))
  );

drop policy if exists domain_events_select on public.domain_events;
create policy domain_events_select on public.domain_events
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'automation.view')
      or public.has_org_permission(organization_id, 'developers.logs.view'))
  );

drop policy if exists automation_rules_select on public.automation_rules;
create policy automation_rules_select on public.automation_rules
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'automation.view')
  );
drop policy if exists automation_rules_write on public.automation_rules;
create policy automation_rules_write on public.automation_rules
  for all using (public.has_org_permission(organization_id, 'automation.manage'))
  with check (public.has_org_permission(organization_id, 'automation.manage'));

drop policy if exists automation_rule_runs_select on public.automation_rule_runs;
create policy automation_rule_runs_select on public.automation_rule_runs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'automation.view')
  );

drop policy if exists automation_tasks_select on public.automation_tasks;
create policy automation_tasks_select on public.automation_tasks
  for select using (
    organization_id in (select public.current_org_ids())
    and (assignee_user_id = public.current_profile_id()
      or public.has_org_permission(organization_id, 'automation.view'))
  );
drop policy if exists automation_tasks_write on public.automation_tasks;
create policy automation_tasks_write on public.automation_tasks
  for all using (public.has_org_permission(organization_id, 'automation.manage'))
  with check (public.has_org_permission(organization_id, 'automation.manage'));

drop policy if exists scheduled_jobs_select on public.scheduled_jobs;
create policy scheduled_jobs_select on public.scheduled_jobs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'automation.jobs.view')
  );
drop policy if exists scheduled_jobs_write on public.scheduled_jobs;
create policy scheduled_jobs_write on public.scheduled_jobs
  for all using (public.has_org_permission(organization_id, 'automation.manage'))
  with check (public.has_org_permission(organization_id, 'automation.manage'));

drop policy if exists job_executions_select on public.job_executions;
create policy job_executions_select on public.job_executions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'automation.jobs.view')
  );

drop policy if exists webhook_endpoints_select on public.webhook_endpoints;
create policy webhook_endpoints_select on public.webhook_endpoints
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'developers.view')
  );
drop policy if exists webhook_endpoints_write on public.webhook_endpoints;
create policy webhook_endpoints_write on public.webhook_endpoints
  for all using (public.has_org_permission(organization_id, 'developers.webhooks.manage'))
  with check (public.has_org_permission(organization_id, 'developers.webhooks.manage'));

drop policy if exists webhook_delivery_attempts_select on public.webhook_delivery_attempts;
create policy webhook_delivery_attempts_select on public.webhook_delivery_attempts
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'developers.logs.view')
  );

drop policy if exists api_keys_select on public.api_keys;
create policy api_keys_select on public.api_keys
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'developers.view')
  );
drop policy if exists api_keys_write on public.api_keys;
create policy api_keys_write on public.api_keys
  for all using (public.has_org_permission(organization_id, 'developers.api_keys.manage'))
  with check (public.has_org_permission(organization_id, 'developers.api_keys.manage'));

drop policy if exists api_request_logs_select on public.api_request_logs;
create policy api_request_logs_select on public.api_request_logs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'developers.logs.view')
  );

grant select, insert, update on public.notification_preferences, public.notification_templates,
  public.notification_deliveries, public.domain_events, public.automation_rules,
  public.automation_rule_runs, public.automation_tasks, public.scheduled_jobs,
  public.job_executions, public.webhook_endpoints, public.webhook_delivery_attempts,
  public.api_keys, public.api_request_logs
  to authenticated;
