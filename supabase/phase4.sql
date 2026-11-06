-- BSB Payroll Phase 4 overlay (Attendance engine).
-- Additive only. Safe to re-run. Does not drop tenant data.
-- Consumes attendance_punches and attendance_days. Does not rebuild Phases 1–3, 5–21.
-- Does not implement face, QR or GPS attendance.

insert into public.permissions (code, name, group_name) values
  ('attendance.manage', 'Manage attendance settings and recalculation', 'Attendance'),
  ('attendance.regularize', 'Submit and decide attendance regularization', 'Attendance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.code in ('attendance.manage', 'attendance.regularize')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code = 'HR'
  and p.code in ('attendance.manage', 'attendance.regularize')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('PAYROLL', 'MANAGER', 'EMPLOYEE')
  and p.code = 'attendance.regularize'
on conflict (role_id, permission_id) do nothing;

alter table public.attendance_days
  add column if not exists shift_id uuid,
  add column if not exists first_in timestamptz,
  add column if not exists last_out timestamptz,
  add column if not exists worked_minutes integer not null default 0,
  add column if not exists late_minutes integer not null default 0,
  add column if not exists early_exit_minutes integer not null default 0,
  add column if not exists ot_minutes integer not null default 0,
  add column if not exists locked boolean not null default false;

create table if not exists public.attendance_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  grace_minutes integer not null default 15,
  break_minutes integer not null default 60,
  full_day_minutes integer not null default 480,
  half_day_minutes integer not null default 240,
  ot_minimum_minutes integer not null default 30,
  ot_rounding_minutes integer not null default 15,
  punch_pairing text not null default 'FIRST_LAST' check (punch_pairing in ('FIRST_LAST', 'PAIRWISE')),
  allow_overnight boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  start_time text not null,
  end_time text not null,
  break_minutes integer not null default 60,
  overnight boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  effective_from date not null,
  effective_to date,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, employee_id, effective_from)
);

create table if not exists public.attendance_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  attendance_day_id uuid references public.attendance_days (id) on delete set null,
  code text not null check (code in ('MISSING_IN', 'MISSING_OUT', 'ABSENT', 'LATE', 'EARLY_EXIT', 'UNMAPPED')),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'DISMISSED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists attendance_exceptions_org_idx on public.attendance_exceptions (organization_id, work_date);
create unique index if not exists attendance_exceptions_dedupe_idx
  on public.attendance_exceptions (organization_id, employee_id, work_date, code);

create table if not exists public.attendance_regularizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  requested_in timestamptz,
  requested_out timestamptz,
  reason text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  original_first_in timestamptz,
  original_last_out timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists attendance_regularizations_org_idx on public.attendance_regularizations (organization_id, work_date);

alter table public.attendance_days
  drop constraint if exists attendance_days_shift_fk;
alter table public.attendance_days
  add constraint attendance_days_shift_fk
  foreign key (shift_id) references public.shifts (id) on delete set null;

drop trigger if exists attendance_policies_updated_at on public.attendance_policies;
create trigger attendance_policies_updated_at
  before update on public.attendance_policies
  for each row execute function public.set_updated_at();

drop trigger if exists shifts_updated_at on public.shifts;
create trigger shifts_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

drop trigger if exists attendance_exceptions_updated_at on public.attendance_exceptions;
create trigger attendance_exceptions_updated_at
  before update on public.attendance_exceptions
  for each row execute function public.set_updated_at();

drop trigger if exists attendance_regularizations_updated_at on public.attendance_regularizations;
create trigger attendance_regularizations_updated_at
  before update on public.attendance_regularizations
  for each row execute function public.set_updated_at();

alter table public.attendance_policies enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.attendance_exceptions enable row level security;
alter table public.attendance_regularizations enable row level security;

drop policy if exists attendance_policies_select on public.attendance_policies;
create policy attendance_policies_select on public.attendance_policies
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.view')
  );
drop policy if exists attendance_policies_write on public.attendance_policies;
create policy attendance_policies_write on public.attendance_policies
  for all using (public.has_org_permission(organization_id, 'attendance.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.manage'));

drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.view')
  );
drop policy if exists shifts_write on public.shifts;
create policy shifts_write on public.shifts
  for all using (public.has_org_permission(organization_id, 'attendance.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.manage'));

drop policy if exists shift_assignments_select on public.shift_assignments;
create policy shift_assignments_select on public.shift_assignments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.view')
  );
drop policy if exists shift_assignments_write on public.shift_assignments;
create policy shift_assignments_write on public.shift_assignments
  for all using (public.has_org_permission(organization_id, 'attendance.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.manage'));

drop policy if exists attendance_exceptions_select on public.attendance_exceptions;
create policy attendance_exceptions_select on public.attendance_exceptions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.view')
  );
drop policy if exists attendance_exceptions_write on public.attendance_exceptions;
create policy attendance_exceptions_write on public.attendance_exceptions
  for all using (public.has_org_permission(organization_id, 'attendance.manage'))
  with check (public.has_org_permission(organization_id, 'attendance.manage'));

drop policy if exists attendance_regularizations_select on public.attendance_regularizations;
create policy attendance_regularizations_select on public.attendance_regularizations
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'attendance.view')
  );
drop policy if exists attendance_regularizations_write on public.attendance_regularizations;
create policy attendance_regularizations_write on public.attendance_regularizations
  for all using (
    public.has_org_permission(organization_id, 'attendance.regularize')
    or public.has_org_permission(organization_id, 'attendance.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'attendance.regularize')
    or public.has_org_permission(organization_id, 'attendance.manage')
  );

grant select, insert, update on public.attendance_policies, public.shifts, public.shift_assignments,
  public.attendance_exceptions, public.attendance_regularizations to authenticated;
