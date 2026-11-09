-- BSB Payroll Phase 21 overlay (Smart Auto Attendance — no biometric hardware).
-- Additive only. Safe to re-run. Does not drop tenant data.
-- Does not start Phase 4 attendance calculation. Accepted events feed attendance_punches only.

insert into public.permissions (code, name, group_name) values
  ('attendance.smart.view', 'View smart attendance', 'Attendance'),
  ('attendance.smart.manage', 'Manage smart attendance settings', 'Attendance'),
  ('attendance.device.manage', 'Manage trusted employee devices', 'Attendance'),
  ('attendance.correct', 'Record authorized attendance corrections', 'Attendance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.code in ('attendance.smart.view', 'attendance.smart.manage', 'attendance.device.manage', 'attendance.correct')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code = 'HR'
  and p.code in ('attendance.smart.view', 'attendance.smart.manage', 'attendance.device.manage', 'attendance.correct')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('PAYROLL', 'MANAGER', 'EMPLOYEE')
  and p.code = 'attendance.smart.view'
on conflict (role_id, permission_id) do nothing;

alter table public.biometric_raw_events drop constraint if exists biometric_raw_events_source_check;
alter table public.biometric_raw_events
  add constraint biometric_raw_events_source_check
  check (source in ('PUSH', 'WEBHOOK', 'SIMULATOR', 'SMART_GEOFENCE', 'QR_FALLBACK'));

alter table public.attendance_punches drop constraint if exists attendance_punches_source_check;
alter table public.attendance_punches
  add constraint attendance_punches_source_check
  check (source in ('PUSH', 'WEBHOOK', 'SIMULATOR', 'SMART_GEOFENCE', 'QR_FALLBACK'));

create table if not exists public.smart_attendance_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  enabled boolean not null default false,
  geofence_radius_meters integer not null default 100 check (geofence_radius_meters between 30 and 2000),
  accuracy_threshold_meters integer not null default 50 check (accuracy_threshold_meters between 10 and 500),
  freshness_seconds integer not null default 120 check (freshness_seconds between 30 and 3600),
  max_trusted_devices integer not null default 1 check (max_trusted_devices between 1 and 5),
  require_trusted_device boolean not null default true,
  require_precise_location boolean not null default true,
  background_location_enabled boolean not null default false,
  auto_accept_policy text not null default 'LOW_RISK_ONLY'
    check (auto_accept_policy in ('OFF', 'LOW_RISK_ONLY', 'LOW_AND_MEDIUM')),
  qr_fallback_enabled boolean not null default true,
  dynamic_pin_enabled boolean not null default false,
  qr_ttl_seconds integer not null default 90 check (qr_ttl_seconds between 30 and 300),
  entry_window_start text not null default '00:00',
  entry_window_end text not null default '23:59',
  exit_window_start text not null default '00:00',
  exit_window_end text not null default '23:59',
  duplicate_interval_seconds integer not null default 120 check (duplicate_interval_seconds between 30 and 3600),
  face_provider_kind text not null default 'NONE'
    check (face_provider_kind in ('NONE', 'EXTERNAL')),
  face_provider_configured boolean not null default false,
  retention_days integer not null default 365 check (retention_days between 30 and 2555),
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.smart_attendance_settings
  add column if not exists exit_window_start text not null default '00:00';
alter table public.smart_attendance_settings
  add column if not exists exit_window_end text not null default '23:59';
alter table public.smart_attendance_settings
  add column if not exists duplicate_interval_seconds integer not null default 120;

create table if not exists public.attendance_location_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 100 check (radius_meters between 30 and 2000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_location_configs_org_idx
  on public.attendance_location_configs (organization_id, status);

create table if not exists public.trusted_employee_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  public_key text not null,
  device_model text not null,
  os_version text not null,
  app_version text not null,
  attestation_kind text not null default 'NONE',
  attestation_result text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'REVOKED', 'LOST', 'REPLACEMENT_PENDING')),
  registered_at timestamptz not null default now(),
  last_active_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, public_key)
);

create index if not exists trusted_employee_devices_employee_idx
  on public.trusted_employee_devices (organization_id, employee_id, status);

create table if not exists public.geofence_event_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  device_id uuid not null references public.trusted_employee_devices (id) on delete cascade,
  workplace_id uuid not null references public.attendance_location_configs (id) on delete cascade,
  kind text not null check (kind in ('ENTER', 'EXIT', 'DWELL')),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  permission_status text not null,
  mock_location boolean not null default false,
  integrity_result text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists geofence_event_candidates_org_idx
  on public.geofence_event_candidates (organization_id, occurred_at desc);

create table if not exists public.smart_attendance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  device_id uuid references public.trusted_employee_devices (id) on delete set null,
  workplace_id uuid references public.attendance_location_configs (id) on delete set null,
  candidate_id uuid references public.geofence_event_candidates (id) on delete set null,
  source text not null check (source in ('GEOFENCE', 'QR', 'MANUAL_CORRECTION')),
  direction text not null check (direction in ('IN', 'OUT', 'UNKNOWN')),
  status text not null
    check (status in ('RECEIVED', 'ACCEPTED', 'REJECTED', 'FLAGGED', 'PENDING_VERIFICATION', 'PENDING_REVIEW', 'DUPLICATE', 'EXPIRED')),
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  risk_reasons text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  occurred_at timestamptz not null,
  idempotency_key text not null,
  punch_id uuid references public.attendance_punches (id) on delete set null,
  notes text,
  reviewed_by uuid references public.user_profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists smart_attendance_events_org_idx
  on public.smart_attendance_events (organization_id, occurred_at desc);
create index if not exists smart_attendance_events_employee_idx
  on public.smart_attendance_events (employee_id, occurred_at desc);
create index if not exists smart_attendance_events_status_idx
  on public.smart_attendance_events (organization_id, status);

create table if not exists public.attendance_verification_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid not null references public.smart_attendance_events (id) on delete cascade,
  method text not null check (method in ('NONE', 'DEVICE_BIOMETRIC', 'DYNAMIC_PIN', 'FACE_PROVIDER', 'HR_REVIEW')),
  outcome text not null check (outcome in ('PASSED', 'FAILED', 'SKIPPED', 'UNAVAILABLE')),
  provider text,
  risk_reason text not null default '',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists attendance_verification_records_event_idx
  on public.attendance_verification_records (event_id, recorded_at desc);

create table if not exists public.device_security_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  device_id uuid not null references public.trusted_employee_devices (id) on delete cascade,
  mock_location boolean not null default false,
  play_integrity text,
  rooted boolean,
  notes text not null default '',
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists device_security_assessments_device_idx
  on public.device_security_assessments (device_id, assessed_at desc);

create table if not exists public.dynamic_qr_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workplace_id uuid not null references public.attendance_location_configs (id) on delete cascade,
  token_hash text not null unique,
  token_hint text not null,
  pin_hash text,
  direction text not null check (direction in ('IN', 'OUT', 'UNKNOWN')),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_employee_id uuid references public.employees (id) on delete set null,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dynamic_qr_sessions_org_idx
  on public.dynamic_qr_sessions (organization_id, status, expires_at);

drop trigger if exists smart_attendance_settings_updated_at on public.smart_attendance_settings;
create trigger smart_attendance_settings_updated_at
  before update on public.smart_attendance_settings
  for each row execute function public.set_updated_at();

drop trigger if exists attendance_location_configs_updated_at on public.attendance_location_configs;
create trigger attendance_location_configs_updated_at
  before update on public.attendance_location_configs
  for each row execute function public.set_updated_at();

drop trigger if exists trusted_employee_devices_updated_at on public.trusted_employee_devices;
create trigger trusted_employee_devices_updated_at
  before update on public.trusted_employee_devices
  for each row execute function public.set_updated_at();

drop trigger if exists smart_attendance_events_updated_at on public.smart_attendance_events;
create trigger smart_attendance_events_updated_at
  before update on public.smart_attendance_events
  for each row execute function public.set_updated_at();

drop trigger if exists dynamic_qr_sessions_updated_at on public.dynamic_qr_sessions;
create trigger dynamic_qr_sessions_updated_at
  before update on public.dynamic_qr_sessions
  for each row execute function public.set_updated_at();

alter table public.smart_attendance_settings enable row level security;
alter table public.attendance_location_configs enable row level security;
alter table public.trusted_employee_devices enable row level security;
alter table public.geofence_event_candidates enable row level security;
alter table public.smart_attendance_events enable row level security;
alter table public.attendance_verification_records enable row level security;
alter table public.device_security_assessments enable row level security;
alter table public.dynamic_qr_sessions enable row level security;

drop policy if exists smart_attendance_settings_select on public.smart_attendance_settings;
create policy smart_attendance_settings_select on public.smart_attendance_settings
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.smart.view')
  );
drop policy if exists smart_attendance_settings_write on public.smart_attendance_settings;
create policy smart_attendance_settings_write on public.smart_attendance_settings
  for all using (public.has_org_permission(organization_id, 'attendance.smart.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.smart.manage'));

drop policy if exists attendance_location_configs_select on public.attendance_location_configs;
create policy attendance_location_configs_select on public.attendance_location_configs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.smart.view')
  );
drop policy if exists attendance_location_configs_write on public.attendance_location_configs;
create policy attendance_location_configs_write on public.attendance_location_configs
  for all using (public.has_org_permission(organization_id, 'attendance.smart.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.smart.manage'));

drop policy if exists trusted_employee_devices_select on public.trusted_employee_devices;
create policy trusted_employee_devices_select on public.trusted_employee_devices
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'attendance.smart.view')
      or public.has_org_permission(organization_id, 'attendance.device.manage')
    )
  );
drop policy if exists trusted_employee_devices_write on public.trusted_employee_devices;
create policy trusted_employee_devices_write on public.trusted_employee_devices
  for all using (public.has_org_permission(organization_id, 'attendance.device.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.device.manage'));

drop policy if exists geofence_event_candidates_select on public.geofence_event_candidates;
create policy geofence_event_candidates_select on public.geofence_event_candidates
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.smart.view')
  );
drop policy if exists geofence_event_candidates_insert on public.geofence_event_candidates;
create policy geofence_event_candidates_insert on public.geofence_event_candidates
  for insert with check (false);

drop policy if exists smart_attendance_events_select on public.smart_attendance_events;
create policy smart_attendance_events_select on public.smart_attendance_events
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.smart.view')
  );
drop policy if exists smart_attendance_events_write on public.smart_attendance_events;
create policy smart_attendance_events_write on public.smart_attendance_events
  for all using (
    public.has_org_permission(organization_id, 'attendance.smart.manage')
    or public.has_org_permission(organization_id, 'attendance.correct')
  )
  with check (
    public.has_org_permission(organization_id, 'attendance.smart.manage')
    or public.has_org_permission(organization_id, 'attendance.correct')
  );

drop policy if exists attendance_verification_records_select on public.attendance_verification_records;
create policy attendance_verification_records_select on public.attendance_verification_records
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.smart.view')
  );
drop policy if exists attendance_verification_records_insert on public.attendance_verification_records;
create policy attendance_verification_records_insert on public.attendance_verification_records
  for insert with check (false);

drop policy if exists device_security_assessments_select on public.device_security_assessments;
create policy device_security_assessments_select on public.device_security_assessments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.device.manage')
  );
drop policy if exists device_security_assessments_insert on public.device_security_assessments;
create policy device_security_assessments_insert on public.device_security_assessments
  for insert with check (false);

drop policy if exists dynamic_qr_sessions_select on public.dynamic_qr_sessions;
create policy dynamic_qr_sessions_select on public.dynamic_qr_sessions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.smart.view')
  );
drop policy if exists dynamic_qr_sessions_write on public.dynamic_qr_sessions;
create policy dynamic_qr_sessions_write on public.dynamic_qr_sessions
  for all using (public.has_org_permission(organization_id, 'attendance.smart.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.smart.manage'));

grant select, insert, update on public.smart_attendance_settings, public.attendance_location_configs,
  public.trusted_employee_devices, public.geofence_event_candidates, public.smart_attendance_events,
  public.attendance_verification_records, public.device_security_assessments, public.dynamic_qr_sessions
  to authenticated;
