-- BSB Payroll Phase 3 — Universal Biometric Integration Engine
-- Safe to re-run. Additive only. Does not modify Phase 1/2 tables.
-- Prefer supabase/combined.sql for a fresh project.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.biometric_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  vendor text not null check (vendor in ('ESSL', 'GENERIC')),
  serial_number text not null,
  model text,
  firmware text,
  connection_mode text not null check (connection_mode in ('PUSH', 'WEBHOOK', 'SIMULATOR')),
  branch_id uuid references public.branches (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  timezone text not null default 'Asia/Kolkata',
  token_hash text not null,
  token_hint text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'DISABLED', 'OFFLINE')),
  last_seen_at timestamptz,
  last_error text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, serial_number)
);

create unique index if not exists biometric_devices_token_hash_idx
  on public.biometric_devices (token_hash);
create index if not exists biometric_devices_org_idx
  on public.biometric_devices (organization_id, status);

create table if not exists public.biometric_identity_maps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  device_id uuid not null references public.biometric_devices (id) on delete cascade,
  device_user_id text not null,
  employee_id uuid not null references public.employees (id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists biometric_identity_maps_user_active_idx
  on public.biometric_identity_maps (device_id, device_user_id)
  where status = 'ACTIVE';
create unique index if not exists biometric_identity_maps_employee_active_idx
  on public.biometric_identity_maps (device_id, employee_id)
  where status = 'ACTIVE';
create index if not exists biometric_identity_maps_org_idx
  on public.biometric_identity_maps (organization_id);

create table if not exists public.biometric_raw_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  device_id uuid references public.biometric_devices (id) on delete set null,
  vendor text,
  source text not null check (source in ('PUSH', 'WEBHOOK', 'SIMULATOR')),
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'NORMALIZED', 'MAPPED', 'UNMAPPED', 'DUPLICATE', 'REJECTED')),
  error_message text
);

create index if not exists biometric_raw_events_org_idx
  on public.biometric_raw_events (organization_id, received_at desc);
create index if not exists biometric_raw_events_device_idx
  on public.biometric_raw_events (device_id, received_at desc);
create index if not exists biometric_raw_events_hash_idx
  on public.biometric_raw_events (payload_hash, received_at desc);

create table if not exists public.biometric_normalized_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  device_id uuid not null references public.biometric_devices (id) on delete cascade,
  raw_event_id uuid not null references public.biometric_raw_events (id) on delete cascade,
  vendor text not null,
  device_user_id text not null,
  punched_at timestamptz not null,
  punched_at_local text,
  timezone text not null,
  direction text not null check (direction in ('IN', 'OUT', 'UNKNOWN')),
  verification_mode text not null default 'UNKNOWN',
  work_code text,
  payload_hash text not null,
  status text not null default 'NORMALIZED'
    check (status in ('RECEIVED', 'NORMALIZED', 'MAPPED', 'UNMAPPED', 'DUPLICATE', 'REJECTED')),
  created_at timestamptz not null default now()
);

create unique index if not exists biometric_normalized_dedupe_idx
  on public.biometric_normalized_events (device_id, device_user_id, punched_at);
create index if not exists biometric_normalized_unmapped_idx
  on public.biometric_normalized_events (organization_id, status, created_at desc);

create table if not exists public.attendance_punches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  device_id uuid not null references public.biometric_devices (id) on delete cascade,
  normalized_event_id uuid not null references public.biometric_normalized_events (id) on delete cascade,
  punched_at timestamptz not null,
  punched_at_local text,
  timezone text not null,
  direction text not null check (direction in ('IN', 'OUT', 'UNKNOWN')),
  verification_mode text not null default 'UNKNOWN',
  source text not null check (source in ('PUSH', 'WEBHOOK', 'SIMULATOR')),
  created_at timestamptz not null default now()
);

create unique index if not exists attendance_punches_dedupe_idx
  on public.attendance_punches (device_id, employee_id, punched_at);
create index if not exists attendance_punches_org_idx
  on public.attendance_punches (organization_id, punched_at desc);
create index if not exists attendance_punches_employee_idx
  on public.attendance_punches (employee_id, punched_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists biometric_devices_updated_at on public.biometric_devices;
create trigger biometric_devices_updated_at
  before update on public.biometric_devices
  for each row execute function public.set_updated_at();

drop trigger if exists biometric_identity_maps_updated_at on public.biometric_identity_maps;
create trigger biometric_identity_maps_updated_at
  before update on public.biometric_identity_maps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_name) values
  ('biometric.view', 'View biometric devices and punches', 'Biometric'),
  ('biometric.manage', 'Manage biometric devices', 'Biometric'),
  ('biometric.mapping', 'Map device users to employees', 'Biometric')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.code in ('biometric.view', 'biometric.manage', 'biometric.mapping')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('biometric.view', 'biometric.manage', 'biometric.mapping')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'biometric.view'
where r.organization_id is null and r.code in ('PAYROLL', 'MANAGER')
on conflict (role_id, permission_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.biometric_devices enable row level security;
alter table public.biometric_identity_maps enable row level security;
alter table public.biometric_raw_events enable row level security;
alter table public.biometric_normalized_events enable row level security;
alter table public.attendance_punches enable row level security;

drop policy if exists biometric_devices_select on public.biometric_devices;
create policy biometric_devices_select on public.biometric_devices
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'biometric.view')
  );

drop policy if exists biometric_devices_write on public.biometric_devices;
create policy biometric_devices_write on public.biometric_devices
  for all using (public.has_org_permission(organization_id, 'biometric.manage'))
  with check (public.has_org_permission(organization_id, 'biometric.manage'));

drop policy if exists biometric_maps_select on public.biometric_identity_maps;
create policy biometric_maps_select on public.biometric_identity_maps
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'biometric.view')
  );

drop policy if exists biometric_maps_write on public.biometric_identity_maps;
create policy biometric_maps_write on public.biometric_identity_maps
  for all using (public.has_org_permission(organization_id, 'biometric.mapping'))
  with check (public.has_org_permission(organization_id, 'biometric.mapping'));

drop policy if exists biometric_raw_select on public.biometric_raw_events;
create policy biometric_raw_select on public.biometric_raw_events
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'biometric.view')
  );

drop policy if exists biometric_raw_insert on public.biometric_raw_events;
create policy biometric_raw_insert on public.biometric_raw_events
  for insert with check (false);

drop policy if exists biometric_normalized_select on public.biometric_normalized_events;
create policy biometric_normalized_select on public.biometric_normalized_events
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'biometric.view')
  );

drop policy if exists attendance_punches_select on public.attendance_punches;
create policy attendance_punches_select on public.attendance_punches
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'biometric.view')
  );

grant select, insert, update on public.biometric_devices, public.biometric_identity_maps to authenticated;
grant select on public.biometric_raw_events, public.biometric_normalized_events, public.attendance_punches to authenticated;
