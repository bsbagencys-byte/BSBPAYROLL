-- BSB Payroll combined schema (Phase 1 + Phase 2)
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT.
-- Do not run seed.sql in production.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers (table-independent)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  display_name text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pin text,
  pan text,
  tan text,
  gstin text,
  industry text,
  payroll_frequency text not null default 'MONTHLY',
  weekly_off text not null default 'SUNDAY',
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  setup_completed boolean not null default false,
  setup_step integer not null default 1,
  status text not null default 'PENDING_SETUP'
    check (status in ('PENDING_SETUP', 'ACTIVE', 'SUSPENDED')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_status_idx on public.organizations (status);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  username citext not null unique,
  display_name text not null,
  mobile text,
  photo_url text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED', 'PENDING')),
  is_demo boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_username_idx on public.user_profiles (username);
create index if not exists user_profiles_auth_user_idx on public.user_profiles (auth_user_id);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists roles_global_code_idx on public.roles (code) where organization_id is null;
create unique index if not exists roles_org_code_idx on public.roles (organization_id, code) where organization_id is not null;
create index if not exists roles_org_idx on public.roles (organization_id);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  group_name text not null
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  unique (role_id, permission_id)
);

create index if not exists role_permissions_role_idx on public.role_permissions (role_id);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  address text,
  city text,
  state text,
  pin text,
  phone text,
  email text,
  is_default boolean not null default false,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists branches_org_idx on public.branches (organization_id);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  manager_employee_id uuid,
  is_default boolean not null default false,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists departments_org_idx on public.departments (organization_id);

create table if not exists public.designations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  department_id uuid references public.departments (id) on delete set null,
  is_default boolean not null default false,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designations_org_idx on public.designations (organization_id);
create index if not exists designations_department_idx on public.designations (department_id);

create table if not exists public.organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  branch_id uuid references public.branches (id) on delete set null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED', 'INVITED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_users_org_idx on public.organization_users (organization_id);
create index if not exists organization_users_user_idx on public.organization_users (user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  actor_user_id uuid references public.user_profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  username citext not null,
  ip_address text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_lookup_idx
  on public.login_attempts (username, ip_address, created_at desc);

create table if not exists public.username_lookup (
  username citext primary key,
  auth_email text not null,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Phase 2 tables
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  branch_id uuid references public.branches (id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index if not exists locations_org_idx on public.locations (organization_id);

create table if not exists public.employment_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  is_system boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index if not exists employment_types_org_idx on public.employment_types (organization_id);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_code text not null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  display_name text not null,
  gender text check (gender in ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED')),
  date_of_birth date,
  mobile text,
  alternate_mobile text,
  personal_email text,
  photo_url text,
  emergency_contact_name text,
  emergency_contact_number text,
  emergency_relationship text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED')),
  user_id uuid references public.user_profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_code)
);

create index if not exists employees_org_idx on public.employees (organization_id);
create index if not exists employees_org_status_idx on public.employees (organization_id, status);
create index if not exists employees_org_name_idx on public.employees (organization_id, display_name);
create index if not exists employees_mobile_idx on public.employees (organization_id, mobile);

alter table public.departments
  drop constraint if exists departments_manager_employee_id_fkey;
alter table public.departments
  add constraint departments_manager_employee_id_fkey
  foreign key (manager_employee_id) references public.employees (id) on delete set null;

create table if not exists public.employee_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null unique references public.employees (id) on delete cascade,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_addresses_org_idx on public.employee_addresses (organization_id);

create table if not exists public.employee_employment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null unique references public.employees (id) on delete cascade,
  joining_date date,
  employment_type_id uuid references public.employment_types (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  designation_id uuid references public.designations (id) on delete set null,
  reporting_manager_id uuid references public.employees (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  official_email text,
  work_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_employment_org_idx on public.employee_employment (organization_id);
create index if not exists employee_employment_branch_idx on public.employee_employment (branch_id);
create index if not exists employee_employment_dept_idx on public.employee_employment (department_id);
create index if not exists employee_employment_manager_idx on public.employee_employment (reporting_manager_id);

create table if not exists public.employee_statutory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null unique references public.employees (id) on delete cascade,
  pan text,
  aadhaar_last4 text,
  uan text,
  esic_number text,
  pf_applicable boolean not null default false,
  esi_applicable boolean not null default false,
  pt_applicable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_statutory_org_idx on public.employee_statutory (organization_id);

create table if not exists public.employee_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null unique references public.employees (id) on delete cascade,
  account_holder_name text,
  bank_name text,
  account_number text,
  ifsc text,
  branch_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_bank_accounts_org_idx on public.employee_bank_accounts (organization_id);

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  document_type text not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  uploaded_by uuid references public.user_profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists employee_documents_org_idx on public.employee_documents (organization_id);
create index if not exists employee_documents_employee_idx on public.employee_documents (employee_id);

create table if not exists public.employee_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  event_type text not null,
  old_value text,
  new_value text,
  effective_date date,
  reason text,
  changed_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists employee_history_org_idx on public.employee_history (organization_id, created_at desc);
create index if not exists employee_history_employee_idx on public.employee_history (employee_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers that reference tables (must come after the tables exist)
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.user_profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ou.organization_id
  from public.organization_users ou
  join public.user_profiles up on up.id = ou.user_id
  where up.auth_user_id = auth.uid()
    and ou.status = 'ACTIVE';
$$;

create or replace function public.has_org_permission(org uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_users ou
    join public.user_profiles up on up.id = ou.user_id
    join public.role_permissions rp on rp.role_id = ou.role_id
    join public.permissions p on p.id = rp.permission_id
    where up.auth_user_id = auth.uid()
      and ou.organization_id = org
      and ou.status = 'ACTIVE'
      and p.code = perm
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists branches_updated_at on public.branches;
create trigger branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

drop trigger if exists departments_updated_at on public.departments;
create trigger departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists designations_updated_at on public.designations;
create trigger designations_updated_at
  before update on public.designations
  for each row execute function public.set_updated_at();

drop trigger if exists organization_users_updated_at on public.organization_users;
create trigger organization_users_updated_at
  before update on public.organization_users
  for each row execute function public.set_updated_at();

drop trigger if exists locations_updated_at on public.locations;
create trigger locations_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

drop trigger if exists employment_types_updated_at on public.employment_types;
create trigger employment_types_updated_at
  before update on public.employment_types
  for each row execute function public.set_updated_at();

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists employee_addresses_updated_at on public.employee_addresses;
create trigger employee_addresses_updated_at
  before update on public.employee_addresses
  for each row execute function public.set_updated_at();

drop trigger if exists employee_employment_updated_at on public.employee_employment;
create trigger employee_employment_updated_at
  before update on public.employee_employment
  for each row execute function public.set_updated_at();

drop trigger if exists employee_statutory_updated_at on public.employee_statutory;
create trigger employee_statutory_updated_at
  before update on public.employee_statutory
  for each row execute function public.set_updated_at();

drop trigger if exists employee_bank_accounts_updated_at on public.employee_bank_accounts;
create trigger employee_bank_accounts_updated_at
  before update on public.employee_bank_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed permissions + system roles
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_name) values
  ('organization.view', 'View organization', 'Organization'),
  ('organization.edit', 'Edit organization', 'Organization'),
  ('organization.branch.manage', 'Manage branches', 'Organization'),
  ('organization.department.manage', 'Manage departments', 'Organization'),
  ('organization.designation.manage', 'Manage designations', 'Organization'),
  ('user.view', 'View users', 'Users'),
  ('user.create', 'Create users', 'Users'),
  ('user.edit', 'Edit users', 'Users'),
  ('user.disable', 'Disable users', 'Users'),
  ('employee.view', 'View employees', 'Employees'),
  ('employee.create', 'Create employees', 'Employees'),
  ('employee.edit', 'Edit employees', 'Employees'),
  ('employee.disable', 'Disable employees', 'Employees'),
  ('employee.documents', 'Manage employee documents', 'Employees'),
  ('employee.import', 'Import employees', 'Employees'),
  ('attendance.view', 'View attendance', 'Attendance'),
  ('payroll.view', 'View payroll', 'Payroll'),
  ('payroll.process', 'Process payroll', 'Payroll'),
  ('settings.manage', 'Manage settings', 'Settings')
on conflict (code) do nothing;

insert into public.roles (organization_id, code, name, description, is_system)
select v.organization_id, v.code, v.name, v.description, v.is_system
from (
  values
    (null::uuid, 'SUPER_ADMIN', 'Super Admin', 'Full platform access', true),
    (null::uuid, 'ADMIN', 'Admin', 'Organization administrator', true),
    (null::uuid, 'HR', 'HR', 'Human resources', true),
    (null::uuid, 'PAYROLL', 'Payroll', 'Payroll operations', true),
    (null::uuid, 'ACCOUNTANT', 'Accountant', 'Finance and accounts', true),
    (null::uuid, 'MANAGER', 'Manager', 'Team manager', true),
    (null::uuid, 'EMPLOYEE', 'Employee', 'Employee self-service foundation', true)
) as v(organization_id, code, name, description, is_system)
where not exists (
  select 1 from public.roles r
  where r.code = v.code and r.organization_id is null
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'organization.view','user.view','user.create','user.edit',
  'employee.view','employee.create','employee.edit','employee.disable',
  'employee.documents','employee.import',
  'organization.branch.manage','organization.department.manage','organization.designation.manage',
  'attendance.view','settings.manage'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'organization.view','user.view','employee.view','attendance.view','payroll.view','payroll.process'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('organization.view','employee.view','payroll.view')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'organization.view','user.view','employee.view','attendance.view'
)
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('organization.view','employee.view','attendance.view')
where r.organization_id is null and r.code = 'EMPLOYEE'
on conflict (role_id, permission_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.organization_users enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_attempts enable row level security;
alter table public.username_lookup enable row level security;
alter table public.locations enable row level security;
alter table public.employment_types enable row level security;
alter table public.employees enable row level security;
alter table public.employee_addresses enable row level security;
alter table public.employee_employment enable row level security;
alter table public.employee_statutory enable row level security;
alter table public.employee_bank_accounts enable row level security;
alter table public.employee_documents enable row level security;
alter table public.employee_history enable row level security;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select using (id in (select public.current_org_ids()));

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update using (public.has_org_permission(id, 'organization.edit'));

drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations
  for insert with check (auth.role() = 'authenticated');

drop policy if exists profiles_select on public.user_profiles;
create policy profiles_select on public.user_profiles
  for select using (
    auth_user_id = auth.uid()
    or id in (
      select ou.user_id
      from public.organization_users ou
      where ou.organization_id in (select public.current_org_ids())
    )
  );

drop policy if exists profiles_update_self on public.user_profiles;
create policy profiles_update_self on public.user_profiles
  for update using (auth_user_id = auth.uid());

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select using (
    organization_id is null
    or organization_id in (select public.current_org_ids())
  );

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select using (auth.role() = 'authenticated');

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select using (auth.role() = 'authenticated');

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all using (
    public.has_org_permission(organization_id, 'settings.manage')
    or public.has_org_permission(organization_id, 'organization.branch.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'settings.manage')
    or public.has_org_permission(organization_id, 'organization.branch.manage')
  );

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for all using (
    public.has_org_permission(organization_id, 'settings.manage')
    or public.has_org_permission(organization_id, 'organization.department.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'settings.manage')
    or public.has_org_permission(organization_id, 'organization.department.manage')
  );

drop policy if exists designations_select on public.designations;
create policy designations_select on public.designations
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists designations_write on public.designations;
create policy designations_write on public.designations
  for all using (
    public.has_org_permission(organization_id, 'settings.manage')
    or public.has_org_permission(organization_id, 'organization.designation.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'settings.manage')
    or public.has_org_permission(organization_id, 'organization.designation.manage')
  );

drop policy if exists org_users_select on public.organization_users;
create policy org_users_select on public.organization_users
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists org_users_write on public.organization_users;
create policy org_users_write on public.organization_users
  for all using (public.has_org_permission(organization_id, 'user.edit'))
  with check (public.has_org_permission(organization_id, 'user.edit') or public.has_org_permission(organization_id, 'user.create'));

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select using (
    organization_id in (select public.current_org_ids())
    or actor_user_id = public.current_profile_id()
  );

drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert with check (auth.role() = 'authenticated');

drop policy if exists login_attempts_none on public.login_attempts;
create policy login_attempts_none on public.login_attempts
  for all using (false) with check (false);

drop policy if exists username_lookup_none on public.username_lookup;
create policy username_lookup_none on public.username_lookup
  for all using (false) with check (false);

drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations
  for all using (public.has_org_permission(organization_id, 'settings.manage'))
  with check (public.has_org_permission(organization_id, 'settings.manage'));

drop policy if exists employment_types_select on public.employment_types;
create policy employment_types_select on public.employment_types
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists employment_types_write on public.employment_types;
create policy employment_types_write on public.employment_types
  for all using (public.has_org_permission(organization_id, 'settings.manage'))
  with check (public.has_org_permission(organization_id, 'settings.manage'));

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
  for insert with check (public.has_org_permission(organization_id, 'employee.create'));

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
  for update using (
    public.has_org_permission(organization_id, 'employee.edit')
    or public.has_org_permission(organization_id, 'employee.disable')
  );

drop policy if exists employee_addresses_select on public.employee_addresses;
create policy employee_addresses_select on public.employee_addresses
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );

drop policy if exists employee_addresses_write on public.employee_addresses;
create policy employee_addresses_write on public.employee_addresses
  for all using (public.has_org_permission(organization_id, 'employee.edit'))
  with check (public.has_org_permission(organization_id, 'employee.edit') or public.has_org_permission(organization_id, 'employee.create'));

drop policy if exists employee_employment_select on public.employee_employment;
create policy employee_employment_select on public.employee_employment
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );

drop policy if exists employee_employment_write on public.employee_employment;
create policy employee_employment_write on public.employee_employment
  for all using (public.has_org_permission(organization_id, 'employee.edit'))
  with check (public.has_org_permission(organization_id, 'employee.edit') or public.has_org_permission(organization_id, 'employee.create'));

drop policy if exists employee_statutory_select on public.employee_statutory;
create policy employee_statutory_select on public.employee_statutory
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );

drop policy if exists employee_statutory_write on public.employee_statutory;
create policy employee_statutory_write on public.employee_statutory
  for all using (public.has_org_permission(organization_id, 'employee.edit'))
  with check (public.has_org_permission(organization_id, 'employee.edit') or public.has_org_permission(organization_id, 'employee.create'));

drop policy if exists employee_bank_select on public.employee_bank_accounts;
create policy employee_bank_select on public.employee_bank_accounts
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );

drop policy if exists employee_bank_write on public.employee_bank_accounts;
create policy employee_bank_write on public.employee_bank_accounts
  for all using (public.has_org_permission(organization_id, 'employee.edit'))
  with check (public.has_org_permission(organization_id, 'employee.edit') or public.has_org_permission(organization_id, 'employee.create'));

drop policy if exists employee_documents_select on public.employee_documents;
create policy employee_documents_select on public.employee_documents
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.documents')
  );

drop policy if exists employee_documents_write on public.employee_documents;
create policy employee_documents_write on public.employee_documents
  for all using (public.has_org_permission(organization_id, 'employee.documents'))
  with check (public.has_org_permission(organization_id, 'employee.documents'));

drop policy if exists employee_history_select on public.employee_history;
create policy employee_history_select on public.employee_history
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );

drop policy if exists employee_history_insert on public.employee_history;
create policy employee_history_insert on public.employee_history
  for insert with check (
    public.has_org_permission(organization_id, 'employee.edit')
    or public.has_org_permission(organization_id, 'employee.create')
    or public.has_org_permission(organization_id, 'employee.disable')
  );

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
grant select, insert, update on public.branches, public.departments, public.designations to authenticated;
grant select, insert, update on public.organization_users to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant select, insert, update on public.locations, public.employment_types to authenticated;
grant select, insert, update on public.employees, public.employee_addresses, public.employee_employment,
  public.employee_statutory, public.employee_bank_accounts to authenticated;
grant select, insert, update on public.employee_documents, public.employee_history to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private employee documents, path = {org_id}/{employee_id}/{file}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

drop policy if exists employee_docs_storage_select on storage.objects;
create policy employee_docs_storage_select on storage.objects
  for select using (
    bucket_id = 'employee-documents'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'employee.documents')
  );

drop policy if exists employee_docs_storage_insert on storage.objects;
create policy employee_docs_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'employee-documents'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'employee.documents')
  );

drop policy if exists employee_docs_storage_update on storage.objects;
create policy employee_docs_storage_update on storage.objects
  for update using (
    bucket_id = 'employee-documents'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'employee.documents')
  );
