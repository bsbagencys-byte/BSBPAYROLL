-- BSB Payroll Phase 20 overlay (pilot launch control).
-- Additive only. Safe to re-run. Does not drop tenant data. Does not auto-finalize payroll.

insert into public.permissions (code, name, group_name) values
  ('launch.view', 'View pilot launch control', 'Launch'),
  ('launch.manage', 'Manage pilot launch control', 'Launch')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code = 'SUPER_ADMIN'
  and p.code in ('launch.view', 'launch.manage')
on conflict (role_id, permission_id) do nothing;

create table if not exists public.launch_decisions (
  id uuid primary key default gen_random_uuid(),
  decision text not null
    check (decision in ('READY', 'READY_WITH_LIMITATIONS', 'NOT_READY')),
  summary text not null,
  evidence_json text not null default '{}',
  decided_by uuid references public.user_profiles (id) on delete set null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.module_readiness (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  label text not null,
  status text not null
    check (status in ('PASS', 'PARTIAL', 'FAILED', 'BLOCKED', 'NOT_TESTED')),
  evidence text not null,
  notes text,
  sort_order integer not null default 0,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.release_blockers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null
    check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'MITIGATED', 'ACCEPTED', 'RESOLVED')),
  module_key text not null,
  evidence text not null,
  required_fix text not null,
  organization_id uuid references public.organizations (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_blockers_status_idx on public.release_blockers (status, severity);

create table if not exists public.pilot_organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null
    check (kind in ('SCHOOL', 'HOSPITAL', 'OFFICE', 'MULTI_BRANCH')),
  status text not null default 'PREPARED'
    check (status in ('PREPARED', 'IN_PILOT', 'UAT', 'SIGNED_OFF', 'BLOCKED', 'WITHDRAWN')),
  organization_id uuid references public.organizations (id) on delete set null,
  contact_name text,
  notes text,
  signed_off_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_checklist_items (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references public.pilot_organizations (id) on delete cascade,
  step_key text not null,
  label text not null,
  required boolean not null default true,
  complete boolean not null default false,
  evidence text,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pilot_id, step_key)
);

create table if not exists public.biometric_verifications (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  model text not null,
  method text not null
    check (method in ('SIMULATED', 'SDK_TESTED', 'API_TESTED', 'PHYSICAL_DEVICE_VERIFIED')),
  advertised boolean not null default false,
  result text not null
    check (result in ('PASS', 'PARTIAL', 'FAILED', 'BLOCKED', 'NOT_TESTED')),
  notes text not null,
  tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parallel_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references public.pilot_organizations (id) on delete cascade,
  period_label text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'COMPARED', 'MISMATCHED', 'SIGNED_OFF')),
  expected_net numeric,
  calculated_net numeric,
  mismatch_count integer not null default 0,
  notes text,
  finalized boolean not null default false,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uat_checklist_items (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references public.pilot_organizations (id) on delete cascade,
  role_code text not null
    check (role_code in ('ADMIN', 'HR', 'PAYROLL', 'EMPLOYEE', 'ACCOUNTANT')),
  journey text not null,
  status text not null default 'NOT_TESTED'
    check (status in ('PASS', 'FAIL', 'BLOCKED', 'NOT_TESTED')),
  tester text,
  evidence text,
  tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incident_records (
  id uuid primary key default gen_random_uuid(),
  incident_number text not null unique,
  organization_id uuid references public.organizations (id) on delete set null,
  severity text not null
    check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'MITIGATING', 'RESOLVED', 'CLOSED')),
  title text not null,
  impact text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  resolution text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references public.pilot_organizations (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  module_key text not null,
  kind text not null
    check (kind in ('DEFECT', 'FEATURE_REQUEST')),
  severity text not null
    check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'TRIAGED', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX')),
  summary text not null,
  reproduction text,
  release_version text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.release_gates (
  id uuid primary key default gen_random_uuid(),
  gate_key text not null unique,
  passing boolean not null default false,
  evidence text not null,
  blocker boolean not null default true,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists launch_decisions_updated_at on public.launch_decisions;
create trigger launch_decisions_updated_at before update on public.launch_decisions
  for each row execute function public.set_updated_at();
drop trigger if exists module_readiness_updated_at on public.module_readiness;
create trigger module_readiness_updated_at before update on public.module_readiness
  for each row execute function public.set_updated_at();
drop trigger if exists release_blockers_updated_at on public.release_blockers;
create trigger release_blockers_updated_at before update on public.release_blockers
  for each row execute function public.set_updated_at();
drop trigger if exists pilot_organizations_updated_at on public.pilot_organizations;
create trigger pilot_organizations_updated_at before update on public.pilot_organizations
  for each row execute function public.set_updated_at();
drop trigger if exists pilot_checklist_items_updated_at on public.pilot_checklist_items;
create trigger pilot_checklist_items_updated_at before update on public.pilot_checklist_items
  for each row execute function public.set_updated_at();
drop trigger if exists biometric_verifications_updated_at on public.biometric_verifications;
create trigger biometric_verifications_updated_at before update on public.biometric_verifications
  for each row execute function public.set_updated_at();
drop trigger if exists parallel_payroll_runs_updated_at on public.parallel_payroll_runs;
create trigger parallel_payroll_runs_updated_at before update on public.parallel_payroll_runs
  for each row execute function public.set_updated_at();
drop trigger if exists uat_checklist_items_updated_at on public.uat_checklist_items;
create trigger uat_checklist_items_updated_at before update on public.uat_checklist_items
  for each row execute function public.set_updated_at();
drop trigger if exists incident_records_updated_at on public.incident_records;
create trigger incident_records_updated_at before update on public.incident_records
  for each row execute function public.set_updated_at();
drop trigger if exists pilot_feedback_updated_at on public.pilot_feedback;
create trigger pilot_feedback_updated_at before update on public.pilot_feedback
  for each row execute function public.set_updated_at();
drop trigger if exists release_gates_updated_at on public.release_gates;
create trigger release_gates_updated_at before update on public.release_gates
  for each row execute function public.set_updated_at();

alter table public.launch_decisions enable row level security;
alter table public.module_readiness enable row level security;
alter table public.release_blockers enable row level security;
alter table public.pilot_organizations enable row level security;
alter table public.pilot_checklist_items enable row level security;
alter table public.biometric_verifications enable row level security;
alter table public.parallel_payroll_runs enable row level security;
alter table public.uat_checklist_items enable row level security;
alter table public.incident_records enable row level security;
alter table public.pilot_feedback enable row level security;
alter table public.release_gates enable row level security;

drop policy if exists launch_decisions_select on public.launch_decisions;
create policy launch_decisions_select on public.launch_decisions
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists launch_decisions_write on public.launch_decisions;
create policy launch_decisions_write on public.launch_decisions
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists module_readiness_select on public.module_readiness;
create policy module_readiness_select on public.module_readiness
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists module_readiness_write on public.module_readiness;
create policy module_readiness_write on public.module_readiness
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists release_blockers_select on public.release_blockers;
create policy release_blockers_select on public.release_blockers
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists release_blockers_write on public.release_blockers;
create policy release_blockers_write on public.release_blockers
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists pilot_organizations_select on public.pilot_organizations;
create policy pilot_organizations_select on public.pilot_organizations
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists pilot_organizations_write on public.pilot_organizations;
create policy pilot_organizations_write on public.pilot_organizations
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists pilot_checklist_items_select on public.pilot_checklist_items;
create policy pilot_checklist_items_select on public.pilot_checklist_items
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists pilot_checklist_items_write on public.pilot_checklist_items;
create policy pilot_checklist_items_write on public.pilot_checklist_items
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists biometric_verifications_select on public.biometric_verifications;
create policy biometric_verifications_select on public.biometric_verifications
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists biometric_verifications_write on public.biometric_verifications;
create policy biometric_verifications_write on public.biometric_verifications
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists parallel_payroll_runs_select on public.parallel_payroll_runs;
create policy parallel_payroll_runs_select on public.parallel_payroll_runs
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists parallel_payroll_runs_write on public.parallel_payroll_runs;
create policy parallel_payroll_runs_write on public.parallel_payroll_runs
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists uat_checklist_items_select on public.uat_checklist_items;
create policy uat_checklist_items_select on public.uat_checklist_items
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists uat_checklist_items_write on public.uat_checklist_items;
create policy uat_checklist_items_write on public.uat_checklist_items
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists incident_records_select on public.incident_records;
create policy incident_records_select on public.incident_records
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists incident_records_write on public.incident_records;
create policy incident_records_write on public.incident_records
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists pilot_feedback_select on public.pilot_feedback;
create policy pilot_feedback_select on public.pilot_feedback
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists pilot_feedback_write on public.pilot_feedback;
create policy pilot_feedback_write on public.pilot_feedback
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists release_gates_select on public.release_gates;
create policy release_gates_select on public.release_gates
  for select using (public.has_platform_role('SUPER_ADMIN'));
drop policy if exists release_gates_write on public.release_gates;
create policy release_gates_write on public.release_gates
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

grant select, insert, update on public.launch_decisions, public.module_readiness,
  public.release_blockers, public.pilot_organizations, public.pilot_checklist_items,
  public.biometric_verifications, public.parallel_payroll_runs, public.uat_checklist_items,
  public.incident_records, public.pilot_feedback, public.release_gates
  to authenticated;
