-- BSB Payroll Phase 16 — Analytics, anomaly detection, optional AI and biometric expansion
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–15 modules.
-- No Phase 4 attendance engine. AI is optional. Alerts never mutate payroll records.

insert into public.permissions (code, name, group_name) values
  ('analytics.view', 'View analytics dashboards', 'Analytics'),
  ('analytics.export', 'Export analytics reports', 'Analytics'),
  ('analytics.alerts.manage', 'Acknowledge and resolve analytics alerts', 'Analytics'),
  ('analytics.thresholds.manage', 'Manage analytics anomaly thresholds', 'Analytics'),
  ('analytics.assistant.use', 'Use the optional analytics assistant', 'Analytics')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Analytics'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'analytics.view', 'analytics.export', 'analytics.alerts.manage', 'analytics.thresholds.manage', 'analytics.assistant.use'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'analytics.view', 'analytics.export', 'analytics.alerts.manage', 'analytics.assistant.use'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'analytics.view', 'analytics.export', 'analytics.alerts.manage'
)
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('analytics.view')
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

create table if not exists public.analytics_saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  page text not null default 'DASHBOARD',
  filters_json text not null default '{}',
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_saved_views_org_idx
  on public.analytics_saved_views (organization_id, created_at desc);

create table if not exists public.analytics_thresholds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  rule_code text not null,
  threshold_value numeric not null,
  enabled boolean not null default true,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_code)
);

create table if not exists public.analytics_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  rule_code text not null,
  period text,
  employee_id uuid references public.employees (id) on delete set null,
  run_id uuid,
  entity_type text,
  entity_id text,
  title text not null,
  condition_text text not null,
  actual_value text not null,
  baseline_value text,
  threshold_value text,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  explanation text not null,
  recommended_action text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  assigned_to uuid references public.user_profiles (id) on delete set null,
  notes text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_alerts_idempotency_uidx
  on public.analytics_alerts (organization_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists analytics_alerts_org_idx
  on public.analytics_alerts (organization_id, status, created_at desc);

create table if not exists public.analytics_alert_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  alert_id uuid not null references public.analytics_alerts (id) on delete cascade,
  previous_status text,
  new_status text not null,
  note text,
  actor_id uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_alert_history_idx
  on public.analytics_alert_history (organization_id, alert_id, created_at desc);

create table if not exists public.analytics_refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null default 'ANOMALY_SCAN',
  period text,
  status text not null default 'COMPLETED' check (status in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
  result_json text,
  error_message text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.biometric_compatibility_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  vendor text not null,
  model text,
  integration_method text not null,
  capabilities_json text not null default '[]',
  documentation_url text,
  verification_status text not null default 'UNVERIFIED_HARDWARE'
    check (verification_status in ('VERIFIED_IN_DEMO', 'PROTOCOL_FOUNDATION', 'UNVERIFIED_HARDWARE', 'UNSUPPORTED')),
  known_limitations text,
  adapter_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists biometric_compatibility_vendor_model_uidx
  on public.biometric_compatibility_registry (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), vendor, coalesce(model, ''), integration_method);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.user_profiles (id) on delete set null,
  question_excerpt text not null,
  tools_used_json text not null default '[]',
  status text not null default 'ANSWERED' check (status in ('UNCONFIGURED', 'ANSWERED', 'UNAVAILABLE', 'FAILED')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_org_idx
  on public.ai_usage_logs (organization_id, created_at desc);

drop trigger if exists analytics_saved_views_updated_at on public.analytics_saved_views;
create trigger analytics_saved_views_updated_at before update on public.analytics_saved_views
  for each row execute function public.set_updated_at();
drop trigger if exists analytics_thresholds_updated_at on public.analytics_thresholds;
create trigger analytics_thresholds_updated_at before update on public.analytics_thresholds
  for each row execute function public.set_updated_at();
drop trigger if exists analytics_alerts_updated_at on public.analytics_alerts;
create trigger analytics_alerts_updated_at before update on public.analytics_alerts
  for each row execute function public.set_updated_at();
drop trigger if exists biometric_compatibility_registry_updated_at on public.biometric_compatibility_registry;
create trigger biometric_compatibility_registry_updated_at before update on public.biometric_compatibility_registry
  for each row execute function public.set_updated_at();

alter table public.analytics_saved_views enable row level security;
alter table public.analytics_thresholds enable row level security;
alter table public.analytics_alerts enable row level security;
alter table public.analytics_alert_history enable row level security;
alter table public.analytics_refresh_jobs enable row level security;
alter table public.biometric_compatibility_registry enable row level security;
alter table public.ai_usage_logs enable row level security;

drop policy if exists analytics_saved_views_select on public.analytics_saved_views;
create policy analytics_saved_views_select on public.analytics_saved_views
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'analytics.view')
  );
drop policy if exists analytics_saved_views_write on public.analytics_saved_views;
create policy analytics_saved_views_write on public.analytics_saved_views
  for all using (public.has_org_permission(organization_id, 'analytics.view'))
  with check (public.has_org_permission(organization_id, 'analytics.view'));

drop policy if exists analytics_thresholds_select on public.analytics_thresholds;
create policy analytics_thresholds_select on public.analytics_thresholds
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'analytics.view')
  );
drop policy if exists analytics_thresholds_write on public.analytics_thresholds;
create policy analytics_thresholds_write on public.analytics_thresholds
  for all using (public.has_org_permission(organization_id, 'analytics.thresholds.manage'))
  with check (public.has_org_permission(organization_id, 'analytics.thresholds.manage'));

drop policy if exists analytics_alerts_select on public.analytics_alerts;
create policy analytics_alerts_select on public.analytics_alerts
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'analytics.view')
  );
drop policy if exists analytics_alerts_write on public.analytics_alerts;
create policy analytics_alerts_write on public.analytics_alerts
  for all using (public.has_org_permission(organization_id, 'analytics.alerts.manage'))
  with check (public.has_org_permission(organization_id, 'analytics.alerts.manage'));

drop policy if exists analytics_alert_history_select on public.analytics_alert_history;
create policy analytics_alert_history_select on public.analytics_alert_history
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'analytics.view')
  );

drop policy if exists analytics_refresh_jobs_select on public.analytics_refresh_jobs;
create policy analytics_refresh_jobs_select on public.analytics_refresh_jobs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'analytics.view')
  );

drop policy if exists biometric_compatibility_select on public.biometric_compatibility_registry;
create policy biometric_compatibility_select on public.biometric_compatibility_registry
  for select using (
    organization_id is null
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'biometric.view')
    )
  );
drop policy if exists biometric_compatibility_write on public.biometric_compatibility_registry;
create policy biometric_compatibility_write on public.biometric_compatibility_registry
  for all using (public.has_org_permission(organization_id, 'biometric.manage'))
  with check (public.has_org_permission(organization_id, 'biometric.manage'));

drop policy if exists ai_usage_logs_select on public.ai_usage_logs;
create policy ai_usage_logs_select on public.ai_usage_logs
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      user_id = public.current_profile_id()
      or public.has_org_permission(organization_id, 'analytics.assistant.use')
    )
  );

grant select, insert, update on public.analytics_saved_views, public.analytics_thresholds,
  public.analytics_alerts, public.analytics_alert_history, public.analytics_refresh_jobs,
  public.biometric_compatibility_registry, public.ai_usage_logs
  to authenticated;
