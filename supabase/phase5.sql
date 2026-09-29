-- BSB Payroll Phase 5 — Leave & Holiday Management
-- Safe to re-run. Additive only. Does not modify Phase 1–3 tables.
-- Prefer supabase/combined.sql for a fresh project.

create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  paid boolean not null default true,
  requires_approval boolean not null default true,
  requires_document boolean not null default false,
  allow_half_day boolean not null default true,
  allow_backdated boolean not null default false,
  allow_future boolean not null default true,
  carry_forward_allowed boolean not null default false,
  max_carry_forward numeric,
  encashment_allowed boolean not null default false,
  negative_balance_allowed boolean not null default false,
  is_comp_off boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED', 'ARCHIVED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists leave_types_org_idx on public.leave_types (organization_id, status);

create table if not exists public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  leave_type_id uuid not null references public.leave_types (id) on delete cascade,
  annual_allocation numeric not null default 0,
  accrual_method text not null default 'ANNUAL' check (accrual_method in ('ANNUAL', 'MONTHLY', 'NONE', 'MANUAL')),
  accrual_frequency text not null default 'ANNUAL' check (accrual_frequency in ('ANNUAL', 'MONTHLY', 'NONE')),
  start_balance numeric not null default 0,
  carry_forward boolean not null default false,
  carry_forward_limit numeric,
  encashment boolean not null default false,
  approval_required boolean not null default true,
  count_weekly_off boolean not null default false,
  count_holiday boolean not null default false,
  version integer not null default 1,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leave_policies_org_idx on public.leave_policies (organization_id, leave_type_id, status);

create table if not exists public.leave_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  policy_id uuid not null references public.leave_policies (id) on delete cascade,
  scope text not null check (scope in ('ORGANIZATION', 'BRANCH', 'DEPARTMENT', 'DESIGNATION', 'EMPLOYMENT_TYPE', 'EMPLOYEE')),
  branch_id uuid references public.branches (id) on delete cascade,
  department_id uuid references public.departments (id) on delete cascade,
  designation_id uuid references public.designations (id) on delete cascade,
  employment_type_id uuid references public.employment_types (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists leave_policy_assignments_org_idx on public.leave_policy_assignments (organization_id, policy_id);

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id) on delete cascade,
  year integer not null,
  opening numeric not null default 0,
  allocated numeric not null default 0,
  accrued numeric not null default 0,
  used numeric not null default 0,
  pending numeric not null default 0,
  carry_forward numeric not null default 0,
  adjusted numeric not null default 0,
  available numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, leave_type_id, year)
);

create index if not exists leave_balances_employee_idx on public.leave_balances (employee_id, year);

create table if not exists public.leave_balance_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id) on delete cascade,
  year integer not null,
  source text not null,
  quantity numeric not null,
  balance_before numeric not null,
  balance_after numeric not null,
  reference_id uuid,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leave_balance_tx_employee_idx
  on public.leave_balance_transactions (employee_id, leave_type_id, created_at desc);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id) on delete restrict,
  from_date date not null,
  to_date date not null,
  session text not null default 'FULL' check (session in ('FULL', 'FIRST_HALF', 'SECOND_HALF')),
  days numeric not null,
  reason text,
  contact_during_leave text,
  attachment_name text,
  attachment_data text,
  status text not null default 'PENDING'
    check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN')),
  submitted_at timestamptz,
  decided_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leave_requests_org_idx on public.leave_requests (organization_id, status, from_date);
create index if not exists leave_requests_employee_idx on public.leave_requests (employee_id, from_date);

create table if not exists public.leave_request_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  request_id uuid not null references public.leave_requests (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  session text not null default 'FULL' check (session in ('FULL', 'FIRST_HALF', 'SECOND_HALF')),
  units numeric not null,
  counted boolean not null default true,
  skip_reason text
);

create index if not exists leave_request_days_date_idx on public.leave_request_days (employee_id, work_date);

create table if not exists public.leave_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  request_id uuid not null references public.leave_requests (id) on delete cascade,
  actor_user_id uuid references public.user_profiles (id) on delete set null,
  action text not null check (action in ('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN', 'CORRECTION')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists leave_approvals_request_idx on public.leave_approvals (request_id, created_at);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  holiday_date date not null,
  holiday_type text not null default 'COMPANY' check (holiday_type in ('NATIONAL', 'REGIONAL', 'OPTIONAL', 'COMPANY')),
  branch_id uuid references public.branches (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  optional boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holidays_org_idx on public.holidays (organization_id, holiday_date);

create table if not exists public.comp_off_earnings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  source text not null check (source in ('HOLIDAY', 'WEEKLY_OFF')),
  units numeric not null default 1,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'USED')),
  notes text,
  request_id uuid references public.leave_requests (id) on delete set null,
  decided_by uuid references public.user_profiles (id) on delete set null,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comp_off_earnings_org_idx on public.comp_off_earnings (organization_id, employee_id, status);

create table if not exists public.comp_off_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  earning_id uuid not null references public.comp_off_earnings (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  quantity numeric not null,
  source text not null,
  reference_id uuid,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  status text not null,
  session text not null default 'FULL' check (session in ('FULL', 'FIRST_HALF', 'SECOND_HALF')),
  leave_request_id uuid references public.leave_requests (id) on delete set null,
  source text not null default 'LEAVE',
  previous_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, work_date, session)
);

create index if not exists attendance_days_org_idx on public.attendance_days (organization_id, work_date);
create index if not exists attendance_days_employee_idx on public.attendance_days (employee_id, work_date);

drop trigger if exists leave_types_updated_at on public.leave_types;
create trigger leave_types_updated_at
  before update on public.leave_types
  for each row execute function public.set_updated_at();

drop trigger if exists leave_policies_updated_at on public.leave_policies;
create trigger leave_policies_updated_at
  before update on public.leave_policies
  for each row execute function public.set_updated_at();

drop trigger if exists leave_requests_updated_at on public.leave_requests;
create trigger leave_requests_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();

drop trigger if exists holidays_updated_at on public.holidays;
create trigger holidays_updated_at
  before update on public.holidays
  for each row execute function public.set_updated_at();

drop trigger if exists attendance_days_updated_at on public.attendance_days;
create trigger attendance_days_updated_at
  before update on public.attendance_days
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('leave.view', 'View leave', 'Leave'),
  ('leave.request', 'Submit leave requests', 'Leave'),
  ('leave.approve', 'Approve leave requests', 'Leave'),
  ('leave.manage', 'Manage leave records', 'Leave'),
  ('leave.balance.manage', 'Adjust leave balances', 'Leave'),
  ('leave.policy.manage', 'Manage leave policies', 'Leave'),
  ('leave.calendar.manage', 'Manage holidays', 'Leave'),
  ('leave.comp_off.manage', 'Manage comp-off', 'Leave')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Leave'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.group_name = 'Leave'
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'leave.view'
where r.organization_id is null and r.code in ('PAYROLL', 'ACCOUNTANT')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('leave.view', 'leave.request', 'leave.approve')
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('leave.view', 'leave.request')
where r.organization_id is null and r.code = 'EMPLOYEE'
on conflict (role_id, permission_id) do nothing;

alter table public.leave_types enable row level security;
alter table public.leave_policies enable row level security;
alter table public.leave_policy_assignments enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_balance_transactions enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_request_days enable row level security;
alter table public.leave_approvals enable row level security;
alter table public.holidays enable row level security;
alter table public.comp_off_earnings enable row level security;
alter table public.comp_off_transactions enable row level security;
alter table public.attendance_days enable row level security;

drop policy if exists leave_types_select on public.leave_types;
create policy leave_types_select on public.leave_types
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists leave_types_write on public.leave_types;
create policy leave_types_write on public.leave_types
  for all using (public.has_org_permission(organization_id, 'leave.policy.manage'))
  with check (public.has_org_permission(organization_id, 'leave.policy.manage'));

drop policy if exists leave_policies_select on public.leave_policies;
create policy leave_policies_select on public.leave_policies
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists leave_policies_write on public.leave_policies;
create policy leave_policies_write on public.leave_policies
  for all using (public.has_org_permission(organization_id, 'leave.policy.manage'))
  with check (public.has_org_permission(organization_id, 'leave.policy.manage'));

drop policy if exists leave_policy_assignments_select on public.leave_policy_assignments;
create policy leave_policy_assignments_select on public.leave_policy_assignments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists leave_policy_assignments_write on public.leave_policy_assignments;
create policy leave_policy_assignments_write on public.leave_policy_assignments
  for all using (public.has_org_permission(organization_id, 'leave.policy.manage'))
  with check (public.has_org_permission(organization_id, 'leave.policy.manage'));

drop policy if exists leave_balances_select on public.leave_balances;
create policy leave_balances_select on public.leave_balances
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists leave_balances_write on public.leave_balances;
create policy leave_balances_write on public.leave_balances
  for all using (public.has_org_permission(organization_id, 'leave.balance.manage'))
  with check (public.has_org_permission(organization_id, 'leave.balance.manage'));

drop policy if exists leave_balance_tx_select on public.leave_balance_transactions;
create policy leave_balance_tx_select on public.leave_balance_transactions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );

drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select on public.leave_requests
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists leave_requests_insert on public.leave_requests;
create policy leave_requests_insert on public.leave_requests
  for insert with check (public.has_org_permission(organization_id, 'leave.request'));
drop policy if exists leave_requests_update on public.leave_requests;
create policy leave_requests_update on public.leave_requests
  for update using (
    public.has_org_permission(organization_id, 'leave.request')
    or public.has_org_permission(organization_id, 'leave.approve')
    or public.has_org_permission(organization_id, 'leave.manage')
  );

drop policy if exists leave_request_days_select on public.leave_request_days;
create policy leave_request_days_select on public.leave_request_days
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );

drop policy if exists leave_approvals_select on public.leave_approvals;
create policy leave_approvals_select on public.leave_approvals
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );

drop policy if exists holidays_select on public.holidays;
create policy holidays_select on public.holidays
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists holidays_write on public.holidays;
create policy holidays_write on public.holidays
  for all using (public.has_org_permission(organization_id, 'leave.calendar.manage'))
  with check (public.has_org_permission(organization_id, 'leave.calendar.manage'));

drop policy if exists comp_off_select on public.comp_off_earnings;
create policy comp_off_select on public.comp_off_earnings
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'leave.view')
  );
drop policy if exists comp_off_write on public.comp_off_earnings;
create policy comp_off_write on public.comp_off_earnings
  for all using (public.has_org_permission(organization_id, 'leave.comp_off.manage'))
  with check (public.has_org_permission(organization_id, 'leave.comp_off.manage'));

drop policy if exists attendance_days_select on public.attendance_days;
create policy attendance_days_select on public.attendance_days
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'leave.view')
      or public.has_org_permission(organization_id, 'attendance.view')
    )
  );

grant select, insert, update on public.leave_types, public.leave_policies, public.leave_policy_assignments,
  public.leave_balances, public.leave_requests, public.holidays, public.comp_off_earnings to authenticated;
grant select, insert on public.leave_balance_transactions, public.leave_request_days, public.leave_approvals,
  public.comp_off_transactions, public.attendance_days to authenticated;
