-- BSB Payroll combined schema (Phase 1 + 2 + 3 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12 + 13)
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT.
-- Do not run seed.sql in production. There is no Phase 4 schema.

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

-- BSB Payroll Phase 6 — Salary & Compensation Engine
-- Safe to re-run. Additive only. Does not modify Phase 1–5 tables.
-- Prefer supabase/combined.sql for a fresh project.

create table if not exists public.salary_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  component_type text not null check (component_type in ('EARNING', 'DEDUCTION', 'REIMBURSEMENT')),
  category text not null check (category in ('BASIC', 'ALLOWANCE', 'VARIABLE', 'STATUTORY_PLACEHOLDER', 'BENEFIT', 'DEDUCTION', 'REIMBURSEMENT', 'OTHER')),
  calculation_method text not null check (calculation_method in ('FIXED', 'PERCENTAGE', 'FORMULA', 'MANUAL', 'RESIDUAL')),
  formula text,
  base_component_id uuid references public.salary_components (id) on delete set null,
  fixed_amount numeric,
  percentage numeric,
  frequency text not null default 'MONTHLY' check (frequency in ('MONTHLY', 'ANNUAL', 'ONE_TIME', 'PAYROLL')),
  taxable boolean not null default true,
  include_in_ctc boolean not null default true,
  include_in_gross boolean not null default true,
  variable boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  effective_from date,
  effective_to date,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists salary_components_org_idx on public.salary_components (organization_id, status, sort_order);

create table if not exists public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  ctc_amount numeric,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  effective_from date not null,
  effective_to date,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists salary_structures_org_idx on public.salary_structures (organization_id, status);

create table if not exists public.salary_structure_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  structure_id uuid not null references public.salary_structures (id) on delete cascade,
  component_id uuid not null references public.salary_components (id) on delete restrict,
  calculation_method text not null check (calculation_method in ('FIXED', 'PERCENTAGE', 'FORMULA', 'MANUAL', 'RESIDUAL')),
  formula text,
  base_component_id uuid references public.salary_components (id) on delete set null,
  fixed_amount numeric,
  percentage numeric,
  include_in_ctc boolean not null default true,
  include_in_gross boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists salary_structure_items_structure_idx on public.salary_structure_items (structure_id, sort_order);

create table if not exists public.employee_salary_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  structure_id uuid not null references public.salary_structures (id) on delete restrict,
  ctc_amount numeric not null,
  gross_amount numeric not null default 0,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'CLOSED')),
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_salary_assignments_employee_idx
  on public.employee_salary_assignments (employee_id, effective_from desc);
create index if not exists employee_salary_assignments_org_idx
  on public.employee_salary_assignments (organization_id, status);

create table if not exists public.salary_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  previous_assignment_id uuid references public.employee_salary_assignments (id) on delete set null,
  previous_structure_id uuid references public.salary_structures (id) on delete set null,
  new_structure_id uuid not null references public.salary_structures (id) on delete restrict,
  previous_ctc numeric,
  new_ctc numeric not null,
  effective_from date not null,
  reason text not null,
  notes text,
  status text not null default 'PENDING' check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'APPLIED')),
  decided_at timestamptz,
  applied_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  decided_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salary_revisions_org_idx on public.salary_revisions (organization_id, status, effective_from);

create table if not exists public.salary_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  assignment_id uuid references public.employee_salary_assignments (id) on delete set null,
  revision_id uuid references public.salary_revisions (id) on delete set null,
  change_type text not null,
  old_value text,
  new_value text,
  reason text,
  approved_by uuid references public.user_profiles (id) on delete set null,
  effective_from date not null,
  applied_at timestamptz not null default now(),
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists salary_history_employee_idx on public.salary_history (employee_id, applied_at desc);

create table if not exists public.variable_earnings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  component_id uuid not null references public.salary_components (id) on delete restrict,
  amount numeric not null,
  quantity numeric,
  rate numeric,
  period_from date not null,
  period_to date not null,
  source text not null default 'MANUAL',
  reference text,
  notes text,
  status text not null default 'PENDING' check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists variable_earnings_org_idx on public.variable_earnings (organization_id, employee_id, period_from);

create table if not exists public.reimbursement_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  component_id uuid not null references public.salary_components (id) on delete restrict,
  entry_date date not null,
  amount numeric not null,
  description text,
  reference text,
  include_in_payroll boolean not null default true,
  status text not null default 'PENDING' check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reimbursement_entries_org_idx on public.reimbursement_entries (organization_id, employee_id, entry_date);

drop trigger if exists salary_components_updated_at on public.salary_components;
create trigger salary_components_updated_at
  before update on public.salary_components
  for each row execute function public.set_updated_at();

drop trigger if exists salary_structures_updated_at on public.salary_structures;
create trigger salary_structures_updated_at
  before update on public.salary_structures
  for each row execute function public.set_updated_at();

drop trigger if exists employee_salary_assignments_updated_at on public.employee_salary_assignments;
create trigger employee_salary_assignments_updated_at
  before update on public.employee_salary_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists salary_revisions_updated_at on public.salary_revisions;
create trigger salary_revisions_updated_at
  before update on public.salary_revisions
  for each row execute function public.set_updated_at();

drop trigger if exists variable_earnings_updated_at on public.variable_earnings;
create trigger variable_earnings_updated_at
  before update on public.variable_earnings
  for each row execute function public.set_updated_at();

drop trigger if exists reimbursement_entries_updated_at on public.reimbursement_entries;
create trigger reimbursement_entries_updated_at
  before update on public.reimbursement_entries
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('salary.view', 'View salary', 'Salary'),
  ('salary.manage', 'Assign and edit employee salary', 'Salary'),
  ('salary.component.manage', 'Manage salary components', 'Salary'),
  ('salary.structure.manage', 'Manage salary structures', 'Salary'),
  ('salary.revision.create', 'Create salary revisions', 'Salary'),
  ('salary.revision.approve', 'Approve salary revisions', 'Salary'),
  ('salary.history.view', 'View salary history', 'Salary')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Salary'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.group_name = 'Salary'
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('salary.view', 'salary.manage', 'salary.revision.create', 'salary.history.view')
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('salary.view', 'salary.history.view')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

alter table public.salary_components enable row level security;
alter table public.salary_structures enable row level security;
alter table public.salary_structure_items enable row level security;
alter table public.employee_salary_assignments enable row level security;
alter table public.salary_revisions enable row level security;
alter table public.salary_history enable row level security;
alter table public.variable_earnings enable row level security;
alter table public.reimbursement_entries enable row level security;

drop policy if exists salary_components_select on public.salary_components;
create policy salary_components_select on public.salary_components
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists salary_components_write on public.salary_components;
create policy salary_components_write on public.salary_components
  for all using (public.has_org_permission(organization_id, 'salary.component.manage'))
  with check (public.has_org_permission(organization_id, 'salary.component.manage'));

drop policy if exists salary_structures_select on public.salary_structures;
create policy salary_structures_select on public.salary_structures
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists salary_structures_write on public.salary_structures;
create policy salary_structures_write on public.salary_structures
  for all using (public.has_org_permission(organization_id, 'salary.structure.manage'))
  with check (public.has_org_permission(organization_id, 'salary.structure.manage'));

drop policy if exists salary_structure_items_select on public.salary_structure_items;
create policy salary_structure_items_select on public.salary_structure_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists salary_structure_items_write on public.salary_structure_items;
create policy salary_structure_items_write on public.salary_structure_items
  for all using (public.has_org_permission(organization_id, 'salary.structure.manage'))
  with check (public.has_org_permission(organization_id, 'salary.structure.manage'));

drop policy if exists employee_salary_assignments_select on public.employee_salary_assignments;
create policy employee_salary_assignments_select on public.employee_salary_assignments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists employee_salary_assignments_write on public.employee_salary_assignments;
create policy employee_salary_assignments_write on public.employee_salary_assignments
  for all using (public.has_org_permission(organization_id, 'salary.manage'))
  with check (public.has_org_permission(organization_id, 'salary.manage'));

drop policy if exists salary_revisions_select on public.salary_revisions;
create policy salary_revisions_select on public.salary_revisions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists salary_revisions_insert on public.salary_revisions;
create policy salary_revisions_insert on public.salary_revisions
  for insert with check (public.has_org_permission(organization_id, 'salary.revision.create'));
drop policy if exists salary_revisions_update on public.salary_revisions;
create policy salary_revisions_update on public.salary_revisions
  for update using (
    public.has_org_permission(organization_id, 'salary.revision.create')
    or public.has_org_permission(organization_id, 'salary.revision.approve')
  );

drop policy if exists salary_history_select on public.salary_history;
create policy salary_history_select on public.salary_history
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'salary.history.view')
      or public.has_org_permission(organization_id, 'salary.view')
    )
  );

drop policy if exists variable_earnings_select on public.variable_earnings;
create policy variable_earnings_select on public.variable_earnings
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists variable_earnings_write on public.variable_earnings;
create policy variable_earnings_write on public.variable_earnings
  for all using (public.has_org_permission(organization_id, 'salary.manage'))
  with check (public.has_org_permission(organization_id, 'salary.manage'));

drop policy if exists reimbursement_entries_select on public.reimbursement_entries;
create policy reimbursement_entries_select on public.reimbursement_entries
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'salary.view')
  );
drop policy if exists reimbursement_entries_write on public.reimbursement_entries;
create policy reimbursement_entries_write on public.reimbursement_entries
  for all using (public.has_org_permission(organization_id, 'salary.manage'))
  with check (public.has_org_permission(organization_id, 'salary.manage'));

grant select, insert, update on public.salary_components, public.salary_structures, public.salary_structure_items,
  public.employee_salary_assignments, public.salary_revisions, public.variable_earnings, public.reimbursement_entries
  to authenticated;
grant select, insert on public.salary_history to authenticated;
-- BSB Payroll Phase 7 — Benefits, Reimbursements, TA/DA & Claims
-- Safe to re-run. Additive only. Does not modify Phase 1–6 tables.
-- Prefer supabase/combined.sql for a fresh project.
-- Does not implement loans, payroll runs, PF/ESI/PT/TDS or payslips.

create table if not exists public.benefit_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  category text not null check (category in ('FUEL', 'TELEPHONE', 'INTERNET', 'MEDICAL', 'TRAVEL', 'MEAL', 'OTHER')),
  calculation_method text not null check (calculation_method in ('FIXED', 'PERCENTAGE', 'MANUAL')),
  fixed_amount numeric,
  percentage numeric,
  frequency text not null default 'MONTHLY' check (frequency in ('MONTHLY', 'ANNUAL', 'ONE_TIME')),
  eligibility text,
  tax_treatment text not null default 'UNSET' check (tax_treatment in ('TAXABLE', 'EXEMPT', 'PARTIAL', 'UNSET')),
  include_in_ctc boolean not null default false,
  include_in_gross boolean not null default false,
  effective_from date,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists benefit_types_org_idx on public.benefit_types (organization_id, status);

create table if not exists public.benefit_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  benefit_type_id uuid not null references public.benefit_types (id) on delete restrict,
  max_amount numeric,
  scope text not null default 'ORGANIZATION' check (scope in ('ORGANIZATION', 'BRANCH', 'DEPARTMENT', 'DESIGNATION', 'EMPLOYMENT_TYPE', 'EMPLOYEE')),
  branch_id uuid references public.branches (id) on delete cascade,
  department_id uuid references public.departments (id) on delete cascade,
  designation_id uuid references public.designations (id) on delete cascade,
  employment_type_id uuid references public.employment_types (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete cascade,
  require_assignment boolean not null default false,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists benefit_policies_org_idx on public.benefit_policies (organization_id, benefit_type_id, status);

create table if not exists public.employee_benefits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  benefit_type_id uuid not null references public.benefit_types (id) on delete restrict,
  amount numeric not null,
  calculation_method text not null check (calculation_method in ('FIXED', 'PERCENTAGE', 'MANUAL')),
  percentage numeric,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'CLOSED')),
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_benefits_employee_idx on public.employee_benefits (employee_id, effective_from desc);
create index if not exists employee_benefits_org_idx on public.employee_benefits (organization_id, status);

create table if not exists public.claim_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  category text not null check (category in ('TRAVEL', 'TA_DA', 'FUEL', 'MEDICAL', 'TELEPHONE', 'INTERNET', 'FOOD', 'OTHER')),
  requires_receipt boolean not null default false,
  requires_travel_fields boolean not null default false,
  max_amount numeric,
  workflow_mode text not null default 'TWO_STEP' check (workflow_mode in ('SINGLE', 'TWO_STEP')),
  include_in_payroll_default boolean not null default true,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists claim_types_org_idx on public.claim_types (organization_id, status);

create table if not exists public.claim_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  claim_type_id uuid references public.claim_types (id) on delete set null,
  employee_category text,
  designation_id uuid references public.designations (id) on delete set null,
  city_category text check (city_category is null or city_category in ('A', 'B', 'C', 'OTHER')),
  travel_type text check (travel_type is null or travel_type in ('LOCAL', 'DOMESTIC', 'OVERNIGHT', 'OUTSTATION')),
  da_per_day numeric,
  mileage_rate numeric,
  local_conveyance_limit numeric,
  hotel_limit numeric,
  meal_limit numeric,
  max_amount numeric,
  max_days numeric,
  require_receipt boolean not null default false,
  workflow_mode text not null default 'TWO_STEP' check (workflow_mode in ('SINGLE', 'TWO_STEP')),
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists claim_policies_org_idx on public.claim_policies (organization_id, status, effective_from);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  claim_type_id uuid not null references public.claim_types (id) on delete restrict,
  claim_date date not null,
  period_from date,
  period_to date,
  purpose text,
  submitted_amount numeric not null,
  calculated_amount numeric,
  approved_amount numeric,
  override_reason text,
  notes text,
  reference_number text,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'PAID', 'INCLUDED_IN_PAYROLL'
  )),
  policy_id uuid references public.claim_policies (id) on delete set null,
  distance numeric,
  rate_per_km numeric,
  travel_mode text check (travel_mode is null or travel_mode in ('CAR', 'BIKE', 'BUS', 'TRAIN', 'FLIGHT', 'TAXI', 'OTHER')),
  travel_days numeric,
  city_category text check (city_category is null or city_category in ('A', 'B', 'C', 'OTHER')),
  travel_type text check (travel_type is null or travel_type in ('LOCAL', 'DOMESTIC', 'OVERNIGHT', 'OUTSTATION')),
  include_in_payroll boolean not null default true,
  payroll_period text,
  paid_at timestamptz,
  current_step text check (current_step is null or current_step in ('MANAGER', 'FINANCE', 'SINGLE')),
  submitted_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists claims_org_idx on public.claims (organization_id, status, claim_date);
create index if not exists claims_employee_idx on public.claims (employee_id, claim_date desc);

create table if not exists public.claim_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  description text not null,
  quantity numeric,
  rate numeric,
  amount numeric not null,
  item_date date,
  created_at timestamptz not null default now()
);

create index if not exists claim_items_claim_idx on public.claim_items (claim_id);

create table if not exists public.claim_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  step text not null check (step in ('MANAGER', 'FINANCE', 'SINGLE')),
  decision text not null check (decision in ('APPROVED', 'REJECTED', 'REQUEST_CORRECTION')),
  amount numeric,
  reason text,
  actor_id uuid references public.user_profiles (id) on delete set null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists claim_approvals_claim_idx on public.claim_approvals (claim_id, decided_at);

create table if not exists public.claim_policy_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  check_code text not null,
  result text not null check (result in ('PASS', 'WARN', 'FAIL')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists claim_policy_checks_claim_idx on public.claim_policy_checks (claim_id);

create table if not exists public.claim_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  uploaded_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists claim_attachments_claim_idx on public.claim_attachments (claim_id);

drop trigger if exists benefit_types_updated_at on public.benefit_types;
create trigger benefit_types_updated_at
  before update on public.benefit_types
  for each row execute function public.set_updated_at();

drop trigger if exists benefit_policies_updated_at on public.benefit_policies;
create trigger benefit_policies_updated_at
  before update on public.benefit_policies
  for each row execute function public.set_updated_at();

drop trigger if exists employee_benefits_updated_at on public.employee_benefits;
create trigger employee_benefits_updated_at
  before update on public.employee_benefits
  for each row execute function public.set_updated_at();

drop trigger if exists claim_types_updated_at on public.claim_types;
create trigger claim_types_updated_at
  before update on public.claim_types
  for each row execute function public.set_updated_at();

drop trigger if exists claim_policies_updated_at on public.claim_policies;
create trigger claim_policies_updated_at
  before update on public.claim_policies
  for each row execute function public.set_updated_at();

drop trigger if exists claims_updated_at on public.claims;
create trigger claims_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('benefits.view', 'View benefits', 'Benefits'),
  ('benefits.manage', 'Manage benefit types and policies', 'Benefits'),
  ('benefits.assign', 'Assign employee benefits', 'Benefits'),
  ('claims.view', 'View claims', 'Claims'),
  ('claims.create', 'Create claims', 'Claims'),
  ('claims.edit', 'Edit claims', 'Claims'),
  ('claims.approve', 'Approve claims', 'Claims'),
  ('claims.manage', 'Manage claims', 'Claims'),
  ('claims.export', 'Export claims', 'Claims')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name in ('Benefits', 'Claims')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.group_name in ('Benefits', 'Claims')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('benefits.view', 'claims.view', 'claims.approve', 'claims.export')
where r.organization_id is null and r.code in ('PAYROLL', 'ACCOUNTANT')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('benefits.view', 'claims.view', 'claims.create', 'claims.approve')
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('claims.view', 'claims.create')
where r.organization_id is null and r.code = 'EMPLOYEE'
on conflict (role_id, permission_id) do nothing;

alter table public.benefit_types enable row level security;
alter table public.benefit_policies enable row level security;
alter table public.employee_benefits enable row level security;
alter table public.claim_types enable row level security;
alter table public.claim_policies enable row level security;
alter table public.claims enable row level security;
alter table public.claim_items enable row level security;
alter table public.claim_approvals enable row level security;
alter table public.claim_policy_checks enable row level security;
alter table public.claim_attachments enable row level security;

drop policy if exists benefit_types_select on public.benefit_types;
create policy benefit_types_select on public.benefit_types
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'benefits.view')
  );
drop policy if exists benefit_types_write on public.benefit_types;
create policy benefit_types_write on public.benefit_types
  for all using (public.has_org_permission(organization_id, 'benefits.manage'))
  with check (public.has_org_permission(organization_id, 'benefits.manage'));

drop policy if exists benefit_policies_select on public.benefit_policies;
create policy benefit_policies_select on public.benefit_policies
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'benefits.view')
  );
drop policy if exists benefit_policies_write on public.benefit_policies;
create policy benefit_policies_write on public.benefit_policies
  for all using (public.has_org_permission(organization_id, 'benefits.manage'))
  with check (public.has_org_permission(organization_id, 'benefits.manage'));

drop policy if exists employee_benefits_select on public.employee_benefits;
create policy employee_benefits_select on public.employee_benefits
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'benefits.view')
  );
drop policy if exists employee_benefits_write on public.employee_benefits;
create policy employee_benefits_write on public.employee_benefits
  for all using (public.has_org_permission(organization_id, 'benefits.assign'))
  with check (public.has_org_permission(organization_id, 'benefits.assign'));

drop policy if exists claim_types_select on public.claim_types;
create policy claim_types_select on public.claim_types
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );
drop policy if exists claim_types_write on public.claim_types;
create policy claim_types_write on public.claim_types
  for all using (public.has_org_permission(organization_id, 'claims.manage'))
  with check (public.has_org_permission(organization_id, 'claims.manage'));

drop policy if exists claim_policies_select on public.claim_policies;
create policy claim_policies_select on public.claim_policies
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );
drop policy if exists claim_policies_write on public.claim_policies;
create policy claim_policies_write on public.claim_policies
  for all using (public.has_org_permission(organization_id, 'claims.manage'))
  with check (public.has_org_permission(organization_id, 'claims.manage'));

drop policy if exists claims_select on public.claims;
create policy claims_select on public.claims
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );
drop policy if exists claims_insert on public.claims;
create policy claims_insert on public.claims
  for insert with check (public.has_org_permission(organization_id, 'claims.create'));
drop policy if exists claims_update on public.claims;
create policy claims_update on public.claims
  for update using (
    public.has_org_permission(organization_id, 'claims.edit')
    or public.has_org_permission(organization_id, 'claims.approve')
    or public.has_org_permission(organization_id, 'claims.manage')
    or public.has_org_permission(organization_id, 'claims.create')
  );

drop policy if exists claim_items_select on public.claim_items;
create policy claim_items_select on public.claim_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );
drop policy if exists claim_items_write on public.claim_items;
create policy claim_items_write on public.claim_items
  for all using (
    public.has_org_permission(organization_id, 'claims.create')
    or public.has_org_permission(organization_id, 'claims.edit')
    or public.has_org_permission(organization_id, 'claims.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'claims.create')
    or public.has_org_permission(organization_id, 'claims.edit')
    or public.has_org_permission(organization_id, 'claims.manage')
  );

drop policy if exists claim_approvals_select on public.claim_approvals;
create policy claim_approvals_select on public.claim_approvals
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );
drop policy if exists claim_approvals_insert on public.claim_approvals;
create policy claim_approvals_insert on public.claim_approvals
  for insert with check (public.has_org_permission(organization_id, 'claims.approve'));

drop policy if exists claim_policy_checks_select on public.claim_policy_checks;
create policy claim_policy_checks_select on public.claim_policy_checks
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );

drop policy if exists claim_attachments_select on public.claim_attachments;
create policy claim_attachments_select on public.claim_attachments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'claims.view')
  );
drop policy if exists claim_attachments_insert on public.claim_attachments;
create policy claim_attachments_insert on public.claim_attachments
  for insert with check (
    public.has_org_permission(organization_id, 'claims.create')
    or public.has_org_permission(organization_id, 'claims.edit')
  );

grant select, insert, update on public.benefit_types, public.benefit_policies, public.employee_benefits,
  public.claim_types, public.claim_policies, public.claims, public.claim_items, public.claim_attachments
  to authenticated;
grant select, insert on public.claim_approvals, public.claim_policy_checks to authenticated;

insert into storage.buckets (id, name, public)
values ('claim-receipts', 'claim-receipts', false)
on conflict (id) do nothing;

drop policy if exists claim_receipts_storage_select on storage.objects;
create policy claim_receipts_storage_select on storage.objects
  for select using (
    bucket_id = 'claim-receipts'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'claims.view')
  );

drop policy if exists claim_receipts_storage_insert on storage.objects;
create policy claim_receipts_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'claim-receipts'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and (
      public.has_org_permission(((storage.foldername(name))[1])::uuid, 'claims.create')
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'claims.edit')
    )
  );

-- BSB Payroll Phase 8 — Loans & Advances
-- Safe to re-run. Additive only. Does not modify Phase 1–7 tables.
-- Prefer supabase/combined.sql for a fresh project.
-- Does not implement payroll runs, PF/ESI/PT/TDS or payslips.

create table if not exists public.loan_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  category text not null check (category in ('SALARY_ADVANCE', 'EMPLOYEE_LOAN', 'EMERGENCY_LOAN', 'FESTIVAL_ADVANCE', 'OTHER')),
  description text,
  max_amount numeric,
  max_tenure_months integer,
  interest_method text not null default 'NONE' check (interest_method in ('NONE', 'FLAT', 'REDUCING')),
  interest_rate numeric,
  processing_fee numeric,
  eligibility text,
  allow_multiple_active boolean not null default false,
  auto_deduct_payroll boolean not null default true,
  workflow_mode text not null default 'TWO_STEP' check (workflow_mode in ('SINGLE', 'TWO_STEP')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists loan_types_org_idx on public.loan_types (organization_id, status);

create table if not exists public.loan_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  loan_type_id uuid not null references public.loan_types (id) on delete restrict,
  max_amount numeric,
  max_tenure_months integer,
  max_active_loans integer,
  min_service_months integer,
  scope text not null default 'ORGANIZATION' check (scope in ('ORGANIZATION', 'BRANCH', 'DEPARTMENT', 'DESIGNATION', 'EMPLOYMENT_TYPE', 'EMPLOYEE')),
  branch_id uuid references public.branches (id) on delete cascade,
  department_id uuid references public.departments (id) on delete cascade,
  designation_id uuid references public.designations (id) on delete cascade,
  employment_type_id uuid references public.employment_types (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete cascade,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loan_policies_org_idx on public.loan_policies (organization_id, loan_type_id, status);

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  loan_type_id uuid not null references public.loan_types (id) on delete restrict,
  policy_id uuid references public.loan_policies (id) on delete set null,
  requested_amount numeric not null,
  tenure_months integer not null,
  interest_method text not null check (interest_method in ('NONE', 'FLAT', 'REDUCING')),
  interest_rate numeric,
  processing_fee numeric,
  purpose text,
  requested_date date not null,
  notes text,
  principal numeric not null,
  interest_amount numeric not null default 0,
  total_repayment numeric not null,
  emi_amount numeric not null,
  first_due_date date,
  last_due_date date,
  approved_amount numeric,
  approved_tenure_months integer,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISBURSED'
  )),
  current_step text check (current_step is null or current_step in ('MANAGER', 'FINANCE', 'SINGLE')),
  auto_deduct_payroll boolean not null default true,
  reference_number text,
  submitted_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loan_applications_org_idx on public.loan_applications (organization_id, status, requested_date);
create index if not exists loan_applications_employee_idx on public.loan_applications (employee_id, requested_date desc);

create table if not exists public.loan_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  application_id uuid not null references public.loan_applications (id) on delete restrict,
  employee_id uuid not null references public.employees (id) on delete cascade,
  loan_type_id uuid not null references public.loan_types (id) on delete restrict,
  approved_amount numeric not null,
  disbursed_amount numeric not null,
  interest_amount numeric not null default 0,
  outstanding_principal numeric not null,
  outstanding_interest numeric not null default 0,
  emi_amount numeric not null,
  tenure_months integer not null,
  paid_installments integer not null default 0,
  remaining_installments integer not null,
  start_date date not null,
  end_date date,
  next_due_date date,
  auto_deduct_payroll boolean not null default true,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'WRITTEN_OFF')),
  disbursed_at timestamptz,
  disbursed_by uuid references public.user_profiles (id) on delete set null,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loan_accounts_org_idx on public.loan_accounts (organization_id, status);
create index if not exists loan_accounts_employee_idx on public.loan_accounts (employee_id, status);

create table if not exists public.loan_schedule (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null references public.loan_accounts (id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  principal_amount numeric not null,
  interest_amount numeric not null default 0,
  emi_amount numeric not null,
  paid_amount numeric not null default 0,
  outstanding_amount numeric not null,
  status text not null default 'UPCOMING' check (status in (
    'UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED', 'DEFERRED'
  )),
  paid_at timestamptz,
  payroll_period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, installment_number)
);

create index if not exists loan_schedule_account_idx on public.loan_schedule (account_id, due_date);
create index if not exists loan_schedule_org_idx on public.loan_schedule (organization_id, status, due_date);

create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null references public.loan_accounts (id) on delete cascade,
  schedule_id uuid references public.loan_schedule (id) on delete set null,
  payment_date date not null,
  amount numeric not null,
  principal_amount numeric not null default 0,
  interest_amount numeric not null default 0,
  payment_method text not null check (payment_method in ('CASH', 'BANK', 'PAYROLL', 'OTHER')),
  reference text,
  notes text,
  source text not null default 'MANUAL' check (source in ('MANUAL', 'PAYROLL')),
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loan_repayments_account_idx on public.loan_repayments (account_id, payment_date desc);

create table if not exists public.loan_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null references public.loan_accounts (id) on delete cascade,
  schedule_id uuid references public.loan_schedule (id) on delete set null,
  kind text not null check (kind in ('SKIP', 'DEFER', 'WAIVER', 'WRITE_OFF', 'REVERSAL')),
  amount numeric,
  reason text not null,
  actor_id uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loan_adjustments_account_idx on public.loan_adjustments (account_id, created_at desc);

create table if not exists public.loan_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  application_id uuid not null references public.loan_applications (id) on delete cascade,
  step text not null check (step in ('MANAGER', 'FINANCE', 'SINGLE')),
  decision text not null check (decision in ('APPROVED', 'REJECTED')),
  amount numeric,
  tenure_months integer,
  reason text,
  actor_id uuid references public.user_profiles (id) on delete set null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists loan_approvals_application_idx on public.loan_approvals (application_id, decided_at);

create table if not exists public.loan_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null references public.loan_accounts (id) on delete cascade,
  entry_type text not null check (entry_type in (
    'DISBURSEMENT', 'PRINCIPAL_REPAYMENT', 'INTEREST_REPAYMENT', 'MANUAL_REPAYMENT',
    'PAYROLL_DEDUCTION_REFERENCE', 'ADJUSTMENT', 'WAIVER', 'REVERSAL'
  )),
  before_principal numeric not null,
  before_interest numeric not null,
  amount numeric not null,
  after_principal numeric not null,
  after_interest numeric not null,
  source text not null,
  reference_id uuid,
  notes text,
  actor_id uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loan_ledger_account_idx on public.loan_ledger (account_id, created_at);

drop trigger if exists loan_types_updated_at on public.loan_types;
create trigger loan_types_updated_at
  before update on public.loan_types
  for each row execute function public.set_updated_at();

drop trigger if exists loan_policies_updated_at on public.loan_policies;
create trigger loan_policies_updated_at
  before update on public.loan_policies
  for each row execute function public.set_updated_at();

drop trigger if exists loan_applications_updated_at on public.loan_applications;
create trigger loan_applications_updated_at
  before update on public.loan_applications
  for each row execute function public.set_updated_at();

drop trigger if exists loan_accounts_updated_at on public.loan_accounts;
create trigger loan_accounts_updated_at
  before update on public.loan_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists loan_schedule_updated_at on public.loan_schedule;
create trigger loan_schedule_updated_at
  before update on public.loan_schedule
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('loans.view', 'View loans', 'Loans'),
  ('loans.create', 'Create loan applications', 'Loans'),
  ('loans.edit', 'Edit loan applications', 'Loans'),
  ('loans.approve', 'Approve loans', 'Loans'),
  ('loans.disburse', 'Disburse loans', 'Loans'),
  ('loans.repayment.manage', 'Record loan repayments', 'Loans'),
  ('loans.adjust', 'Adjust, waive or defer loans', 'Loans'),
  ('loans.export', 'Export loans', 'Loans'),
  ('loans.settings', 'Manage loan types and policies', 'Loans')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Loans'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.group_name = 'Loans'
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('loans.view', 'loans.disburse', 'loans.repayment.manage', 'loans.export')
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('loans.view', 'loans.approve', 'loans.disburse', 'loans.repayment.manage', 'loans.export')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('loans.view', 'loans.create', 'loans.approve')
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('loans.view', 'loans.create')
where r.organization_id is null and r.code = 'EMPLOYEE'
on conflict (role_id, permission_id) do nothing;

alter table public.loan_types enable row level security;
alter table public.loan_policies enable row level security;
alter table public.loan_applications enable row level security;
alter table public.loan_accounts enable row level security;
alter table public.loan_schedule enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.loan_adjustments enable row level security;
alter table public.loan_approvals enable row level security;
alter table public.loan_ledger enable row level security;

drop policy if exists loan_types_select on public.loan_types;
create policy loan_types_select on public.loan_types
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_types_write on public.loan_types;
create policy loan_types_write on public.loan_types
  for all using (public.has_org_permission(organization_id, 'loans.settings'))
  with check (public.has_org_permission(organization_id, 'loans.settings'));

drop policy if exists loan_policies_select on public.loan_policies;
create policy loan_policies_select on public.loan_policies
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_policies_write on public.loan_policies;
create policy loan_policies_write on public.loan_policies
  for all using (public.has_org_permission(organization_id, 'loans.settings'))
  with check (public.has_org_permission(organization_id, 'loans.settings'));

drop policy if exists loan_applications_select on public.loan_applications;
create policy loan_applications_select on public.loan_applications
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_applications_insert on public.loan_applications;
create policy loan_applications_insert on public.loan_applications
  for insert with check (public.has_org_permission(organization_id, 'loans.create'));
drop policy if exists loan_applications_update on public.loan_applications;
create policy loan_applications_update on public.loan_applications
  for update using (
    public.has_org_permission(organization_id, 'loans.edit')
    or public.has_org_permission(organization_id, 'loans.approve')
    or public.has_org_permission(organization_id, 'loans.disburse')
    or public.has_org_permission(organization_id, 'loans.create')
  );

drop policy if exists loan_accounts_select on public.loan_accounts;
create policy loan_accounts_select on public.loan_accounts
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_accounts_write on public.loan_accounts;
create policy loan_accounts_write on public.loan_accounts
  for all using (
    public.has_org_permission(organization_id, 'loans.disburse')
    or public.has_org_permission(organization_id, 'loans.repayment.manage')
    or public.has_org_permission(organization_id, 'loans.adjust')
  )
  with check (
    public.has_org_permission(organization_id, 'loans.disburse')
    or public.has_org_permission(organization_id, 'loans.repayment.manage')
    or public.has_org_permission(organization_id, 'loans.adjust')
  );

drop policy if exists loan_schedule_select on public.loan_schedule;
create policy loan_schedule_select on public.loan_schedule
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_schedule_write on public.loan_schedule;
create policy loan_schedule_write on public.loan_schedule
  for all using (
    public.has_org_permission(organization_id, 'loans.disburse')
    or public.has_org_permission(organization_id, 'loans.repayment.manage')
    or public.has_org_permission(organization_id, 'loans.adjust')
  )
  with check (
    public.has_org_permission(organization_id, 'loans.disburse')
    or public.has_org_permission(organization_id, 'loans.repayment.manage')
    or public.has_org_permission(organization_id, 'loans.adjust')
  );

drop policy if exists loan_repayments_select on public.loan_repayments;
create policy loan_repayments_select on public.loan_repayments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_repayments_insert on public.loan_repayments;
create policy loan_repayments_insert on public.loan_repayments
  for insert with check (public.has_org_permission(organization_id, 'loans.repayment.manage'));

drop policy if exists loan_adjustments_select on public.loan_adjustments;
create policy loan_adjustments_select on public.loan_adjustments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_adjustments_insert on public.loan_adjustments;
create policy loan_adjustments_insert on public.loan_adjustments
  for insert with check (public.has_org_permission(organization_id, 'loans.adjust'));

drop policy if exists loan_approvals_select on public.loan_approvals;
create policy loan_approvals_select on public.loan_approvals
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_approvals_insert on public.loan_approvals;
create policy loan_approvals_insert on public.loan_approvals
  for insert with check (public.has_org_permission(organization_id, 'loans.approve'));

drop policy if exists loan_ledger_select on public.loan_ledger;
create policy loan_ledger_select on public.loan_ledger
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'loans.view')
  );
drop policy if exists loan_ledger_insert on public.loan_ledger;
create policy loan_ledger_insert on public.loan_ledger
  for insert with check (
    public.has_org_permission(organization_id, 'loans.disburse')
    or public.has_org_permission(organization_id, 'loans.repayment.manage')
    or public.has_org_permission(organization_id, 'loans.adjust')
  );

grant select, insert, update on public.loan_types, public.loan_policies, public.loan_applications,
  public.loan_accounts, public.loan_schedule
  to authenticated;
grant select, insert on public.loan_repayments, public.loan_adjustments, public.loan_approvals, public.loan_ledger
  to authenticated;


-- BSB Payroll Phase 9 — Payroll run, payslips and statutory compliance
-- Safe to re-run. Additive only. Does not modify Phase 1–8 tables.
-- Prefer supabase/combined.sql for a fresh project.
-- Attendance day calculation remains Phase 4; this run reads leave-written days and treats unmarked working days as paid.

create table if not exists public.statutory_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  head text not null check (head in ('PF', 'ESI', 'PT', 'TDS')),
  name text not null,
  employee_rate numeric not null default 0,
  employer_rate numeric not null default 0,
  wage_ceiling numeric,
  min_wage numeric,
  max_wage numeric,
  fixed_amount numeric,
  slab_json text,
  state_code text,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists statutory_rules_org_idx on public.statutory_rules (organization_id, head, status);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period text not null,
  period_from date not null,
  period_to date not null,
  pay_date date,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'CALCULATED', 'LOCKED', 'PROCESSED', 'PAID')),
  employee_count integer not null default 0,
  included_count integer not null default 0,
  hold_count integer not null default 0,
  error_count integer not null default 0,
  total_gross numeric not null default 0,
  total_earnings numeric not null default 0,
  total_deductions numeric not null default 0,
  total_statutory numeric not null default 0,
  total_reimbursements numeric not null default 0,
  total_claims numeric not null default 0,
  total_loans numeric not null default 0,
  total_net numeric not null default 0,
  employer_contributions numeric not null default 0,
  notes text,
  calculated_at timestamptz,
  locked_at timestamptz,
  processed_at timestamptz,
  paid_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period)
);

create index if not exists payroll_runs_org_idx on public.payroll_runs (organization_id, status, period);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  assignment_id uuid,
  structure_id uuid,
  status text not null default 'INCLUDED' check (status in ('INCLUDED', 'ON_HOLD', 'EXCLUDED', 'ERROR')),
  hold_reason text,
  error_message text,
  working_days numeric not null default 0,
  present_days numeric not null default 0,
  paid_days numeric not null default 0,
  lop_days numeric not null default 0,
  paid_leave_days numeric not null default 0,
  ctc numeric not null default 0,
  monthly_gross numeric not null default 0,
  earnings numeric not null default 0,
  variable_earnings numeric not null default 0,
  reimbursements numeric not null default 0,
  claims numeric not null default 0,
  deductions numeric not null default 0,
  loan_deductions numeric not null default 0,
  pf_employee numeric not null default 0,
  pf_employer numeric not null default 0,
  esi_employee numeric not null default 0,
  esi_employer numeric not null default 0,
  pt_amount numeric not null default 0,
  tds_amount numeric not null default 0,
  statutory_total numeric not null default 0,
  net_pay numeric not null default 0,
  employer_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index if not exists payroll_items_org_idx on public.payroll_items (organization_id, run_id, status);

create table if not exists public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  item_id uuid not null references public.payroll_items (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  kind text not null check (kind in ('EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'CLAIM', 'LOAN', 'STATUTORY', 'EMPLOYER')),
  code text not null,
  name text not null,
  amount numeric not null default 0,
  taxable boolean not null default true,
  reference_id uuid,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists payroll_lines_item_idx on public.payroll_lines (item_id, sort_order);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  item_id uuid not null references public.payroll_items (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  period text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ISSUED', 'VOID')),
  issued_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index if not exists payslips_org_idx on public.payslips (organization_id, employee_id, period);

create table if not exists public.compliance_filings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  head text not null check (head in ('PF', 'ESI', 'PT', 'TDS')),
  period text not null,
  employee_count integer not null default 0,
  employee_amount numeric not null default 0,
  employer_amount numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'READY', 'EXPORTED')),
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, head)
);

create index if not exists compliance_filings_org_idx on public.compliance_filings (organization_id, period, head);

drop trigger if exists statutory_rules_updated_at on public.statutory_rules;
create trigger statutory_rules_updated_at
  before update on public.statutory_rules
  for each row execute function public.set_updated_at();

drop trigger if exists payroll_runs_updated_at on public.payroll_runs;
create trigger payroll_runs_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

drop trigger if exists payroll_items_updated_at on public.payroll_items;
create trigger payroll_items_updated_at
  before update on public.payroll_items
  for each row execute function public.set_updated_at();

drop trigger if exists payslips_updated_at on public.payslips;
create trigger payslips_updated_at
  before update on public.payslips
  for each row execute function public.set_updated_at();

drop trigger if exists compliance_filings_updated_at on public.compliance_filings;
create trigger compliance_filings_updated_at
  before update on public.compliance_filings
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('payroll.lock', 'Lock and unlock payroll', 'Payroll'),
  ('payroll.payslip.view', 'View payslips', 'Payroll'),
  ('payroll.export', 'Export payroll', 'Payroll'),
  ('payroll.settings', 'Manage payroll settings', 'Payroll'),
  ('compliance.view', 'View compliance', 'Compliance'),
  ('compliance.export', 'Export compliance', 'Compliance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.code in ('payroll.lock', 'payroll.payslip.view', 'payroll.export', 'payroll.settings', 'compliance.view', 'compliance.export')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.view', 'payroll.payslip.view', 'payroll.export')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.lock', 'payroll.payslip.view', 'payroll.export', 'payroll.settings', 'compliance.view', 'compliance.export')
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.payslip.view', 'payroll.export', 'compliance.view', 'compliance.export')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.payslip.view')
where r.organization_id is null and r.code = 'EMPLOYEE'
on conflict (role_id, permission_id) do nothing;

alter table public.statutory_rules enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.payroll_lines enable row level security;
alter table public.payslips enable row level security;
alter table public.compliance_filings enable row level security;

drop policy if exists statutory_rules_select on public.statutory_rules;
create policy statutory_rules_select on public.statutory_rules
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'payroll.view') or public.has_org_permission(organization_id, 'payroll.settings'))
  );
drop policy if exists statutory_rules_write on public.statutory_rules;
create policy statutory_rules_write on public.statutory_rules
  for all using (public.has_org_permission(organization_id, 'payroll.settings'))
  with check (public.has_org_permission(organization_id, 'payroll.settings'));

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select on public.payroll_runs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.view')
  );
drop policy if exists payroll_runs_write on public.payroll_runs;
create policy payroll_runs_write on public.payroll_runs
  for all using (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payroll.lock')
  )
  with check (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payroll.lock')
  );

drop policy if exists payroll_items_select on public.payroll_items;
create policy payroll_items_select on public.payroll_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.view')
  );
drop policy if exists payroll_items_write on public.payroll_items;
create policy payroll_items_write on public.payroll_items
  for all using (public.has_org_permission(organization_id, 'payroll.process'))
  with check (public.has_org_permission(organization_id, 'payroll.process'));

drop policy if exists payroll_lines_select on public.payroll_lines;
create policy payroll_lines_select on public.payroll_lines
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'payroll.view') or public.has_org_permission(organization_id, 'payroll.payslip.view'))
  );
drop policy if exists payroll_lines_write on public.payroll_lines;
create policy payroll_lines_write on public.payroll_lines
  for all using (public.has_org_permission(organization_id, 'payroll.process'))
  with check (public.has_org_permission(organization_id, 'payroll.process'));

drop policy if exists payslips_select on public.payslips;
create policy payslips_select on public.payslips
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.payslip.view')
  );
drop policy if exists payslips_write on public.payslips;
create policy payslips_write on public.payslips
  for all using (public.has_org_permission(organization_id, 'payroll.process'))
  with check (public.has_org_permission(organization_id, 'payroll.process'));

drop policy if exists compliance_filings_select on public.compliance_filings;
create policy compliance_filings_select on public.compliance_filings
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'compliance.view')
  );
drop policy if exists compliance_filings_write on public.compliance_filings;
create policy compliance_filings_write on public.compliance_filings
  for all using (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'compliance.export')
  )
  with check (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'compliance.export')
  );

grant select, insert, update on public.statutory_rules, public.payroll_runs, public.payroll_items,
  public.payroll_lines, public.payslips, public.compliance_filings
  to authenticated;

-- BSB Payroll Phase 10 — Review, approval, finalization, lock and payslip foundation
-- Safe to re-run. Additive only. Does not modify Phase 1–9 table data or rebuild the payroll engine.
-- Statutory calculation remains Phase 9 (existing) / Phase 11 (reserved payslip sections). No Phase 4 attendance engine.

alter table public.payroll_runs drop constraint if exists payroll_runs_status_check;
alter table public.payroll_runs add constraint payroll_runs_status_check
  check (status in (
    'DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVAL_PENDING', 'APPROVED',
    'FINALIZED', 'LOCKED', 'PROCESSED', 'PAID', 'CANCELLED'
  ));

alter table public.payroll_runs add column if not exists run_type text not null default 'MONTHLY';
alter table public.payroll_runs add column if not exists warning_count integer not null default 0;
alter table public.payroll_runs add column if not exists snapshot_id uuid;
alter table public.payroll_runs add column if not exists submitted_at timestamptz;
alter table public.payroll_runs add column if not exists reviewed_at timestamptz;
alter table public.payroll_runs add column if not exists approved_at timestamptz;
alter table public.payroll_runs add column if not exists finalized_at timestamptz;
alter table public.payroll_runs add column if not exists cancelled_at timestamptz;
alter table public.payroll_runs add column if not exists cancel_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payroll_runs_run_type_check'
  ) then
    alter table public.payroll_runs
      add constraint payroll_runs_run_type_check
      check (run_type in ('MONTHLY', 'ADJUSTMENT', 'OFF_CYCLE'));
  end if;
end $$;

alter table public.payroll_lines drop constraint if exists payroll_lines_kind_check;
alter table public.payroll_lines add constraint payroll_lines_kind_check
  check (kind in ('EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'CLAIM', 'LOAN', 'STATUTORY', 'EMPLOYER', 'ADJUSTMENT'));

alter table public.payslips add column if not exists payslip_number text;
alter table public.payslips add column if not exists document_path text;
alter table public.payslips add column if not exists snapshot_id uuid;
alter table public.payslips add column if not exists generated_at timestamptz;
alter table public.payslips add column if not exists generated_by uuid references public.user_profiles (id) on delete set null;
alter table public.payslips add column if not exists regenerated_at timestamptz;

create unique index if not exists payslips_org_number_uidx
  on public.payslips (organization_id, payslip_number)
  where payslip_number is not null;

create table if not exists public.payroll_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  item_id uuid references public.payroll_items (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  code text not null check (code in (
    'MISSING_SALARY_STRUCTURE',
    'MISSING_ATTENDANCE',
    'UNRESOLVED_ATTENDANCE_EXCEPTION',
    'UNRESOLVED_LEAVE',
    'INVALID_SALARY_PERIOD',
    'DUPLICATE_SOURCE',
    'LOAN_MISMATCH',
    'NEGATIVE_RESULT',
    'INVALID_EMPLOYEE_STATE',
    'OTHER_CALCULATION_ERROR'
  )),
  severity text not null check (severity in ('ERROR', 'WARNING')),
  status text not null default 'OPEN' check (status in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  message text not null,
  source_type text,
  source_id uuid,
  acknowledged_by uuid references public.user_profiles (id) on delete set null,
  acknowledged_at timestamptz,
  acknowledge_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payroll_exceptions_run_idx on public.payroll_exceptions (organization_id, run_id, severity, status);

create table if not exists public.payroll_approval_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  action text not null,
  previous_status text not null,
  new_status text not null,
  actor_id uuid references public.user_profiles (id) on delete set null,
  actor_role text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists payroll_approval_history_run_idx on public.payroll_approval_history (run_id, created_at);

create table if not exists public.payroll_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  period text not null,
  payload_json text not null,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (run_id)
);

create table if not exists public.payroll_finalization_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  snapshot_id uuid references public.payroll_snapshots (id) on delete set null,
  validation_json text,
  actor_id uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payroll_finalization_logs_run_idx on public.payroll_finalization_logs (run_id, created_at);

create table if not exists public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  item_id uuid references public.payroll_items (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  kind text not null check (kind in ('EARNING', 'DEDUCTION')),
  code text not null,
  name text not null,
  amount numeric not null default 0,
  reason text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'POSTED', 'REVERSED')),
  posted_line_id uuid,
  created_by uuid references public.user_profiles (id) on delete set null,
  posted_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payroll_adjustments_run_idx on public.payroll_adjustments (organization_id, run_id, status);

create table if not exists public.payslip_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  payslip_id uuid not null references public.payslips (id) on delete cascade,
  kind text not null,
  code text not null,
  name text not null,
  amount numeric not null default 0,
  section text not null default 'OTHER',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists payslip_line_items_slip_idx on public.payslip_line_items (payslip_id, sort_order);

create table if not exists public.payslip_sequences (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  fiscal_year text not null,
  month_code text not null,
  last_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, fiscal_year, month_code)
);

drop trigger if exists payroll_exceptions_updated_at on public.payroll_exceptions;
create trigger payroll_exceptions_updated_at
  before update on public.payroll_exceptions
  for each row execute function public.set_updated_at();

drop trigger if exists payroll_adjustments_updated_at on public.payroll_adjustments;
create trigger payroll_adjustments_updated_at
  before update on public.payroll_adjustments
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('payroll.review', 'Review payroll', 'Payroll'),
  ('payroll.approve', 'Approve payroll', 'Payroll'),
  ('payroll.reject', 'Reject payroll', 'Payroll'),
  ('payroll.finalize', 'Finalize payroll', 'Payroll'),
  ('payroll.adjust', 'Create payroll adjustments', 'Payroll'),
  ('payslip.generate', 'Generate payslips', 'Payroll'),
  ('payslip.export', 'Export payslips', 'Payroll')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.code in ('payroll.review', 'payroll.approve', 'payroll.reject', 'payroll.finalize', 'payroll.adjust', 'payslip.generate', 'payslip.export')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.review', 'payroll.approve', 'payroll.reject', 'payslip.export')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.review', 'payroll.approve', 'payroll.reject', 'payroll.finalize', 'payroll.adjust', 'payslip.generate', 'payslip.export')
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('payroll.review', 'payroll.approve', 'payroll.reject', 'payslip.export')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

alter table public.payroll_exceptions enable row level security;
alter table public.payroll_approval_history enable row level security;
alter table public.payroll_snapshots enable row level security;
alter table public.payroll_finalization_logs enable row level security;
alter table public.payroll_adjustments enable row level security;
alter table public.payslip_line_items enable row level security;
alter table public.payslip_sequences enable row level security;

drop policy if exists payroll_exceptions_select on public.payroll_exceptions;
create policy payroll_exceptions_select on public.payroll_exceptions
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'payroll.view') or public.has_org_permission(organization_id, 'payroll.review'))
  );
drop policy if exists payroll_exceptions_write on public.payroll_exceptions;
create policy payroll_exceptions_write on public.payroll_exceptions
  for all using (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payroll.review')
    or public.has_org_permission(organization_id, 'payroll.approve')
  )
  with check (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payroll.review')
    or public.has_org_permission(organization_id, 'payroll.approve')
  );

drop policy if exists payroll_approval_history_select on public.payroll_approval_history;
create policy payroll_approval_history_select on public.payroll_approval_history
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.view')
  );
drop policy if exists payroll_approval_history_insert on public.payroll_approval_history;
create policy payroll_approval_history_insert on public.payroll_approval_history
  for insert with check (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payroll.approve')
    or public.has_org_permission(organization_id, 'payroll.reject')
    or public.has_org_permission(organization_id, 'payroll.finalize')
    or public.has_org_permission(organization_id, 'payroll.lock')
  );

drop policy if exists payroll_snapshots_select on public.payroll_snapshots;
create policy payroll_snapshots_select on public.payroll_snapshots
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'payroll.view') or public.has_org_permission(organization_id, 'payroll.payslip.view'))
  );
drop policy if exists payroll_snapshots_insert on public.payroll_snapshots;
create policy payroll_snapshots_insert on public.payroll_snapshots
  for insert with check (public.has_org_permission(organization_id, 'payroll.finalize'));

drop policy if exists payroll_finalization_logs_select on public.payroll_finalization_logs;
create policy payroll_finalization_logs_select on public.payroll_finalization_logs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.view')
  );
drop policy if exists payroll_finalization_logs_insert on public.payroll_finalization_logs;
create policy payroll_finalization_logs_insert on public.payroll_finalization_logs
  for insert with check (public.has_org_permission(organization_id, 'payroll.finalize'));

drop policy if exists payroll_adjustments_select on public.payroll_adjustments;
create policy payroll_adjustments_select on public.payroll_adjustments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.view')
  );
drop policy if exists payroll_adjustments_write on public.payroll_adjustments;
create policy payroll_adjustments_write on public.payroll_adjustments
  for all using (public.has_org_permission(organization_id, 'payroll.adjust'))
  with check (public.has_org_permission(organization_id, 'payroll.adjust'));

drop policy if exists payslip_line_items_select on public.payslip_line_items;
create policy payslip_line_items_select on public.payslip_line_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payroll.payslip.view')
  );
drop policy if exists payslip_line_items_write on public.payslip_line_items;
create policy payslip_line_items_write on public.payslip_line_items
  for all using (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payslip.generate')
  )
  with check (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payslip.generate')
  );

drop policy if exists payslip_sequences_select on public.payslip_sequences;
create policy payslip_sequences_select on public.payslip_sequences
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'payroll.view') or public.has_org_permission(organization_id, 'payslip.generate'))
  );
drop policy if exists payslip_sequences_write on public.payslip_sequences;
create policy payslip_sequences_write on public.payslip_sequences
  for all using (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payslip.generate')
  )
  with check (
    public.has_org_permission(organization_id, 'payroll.process')
    or public.has_org_permission(organization_id, 'payslip.generate')
  );

grant select, insert, update on public.payroll_exceptions, public.payroll_adjustments,
  public.payslip_line_items, public.payslip_sequences
  to authenticated;
grant select, insert on public.payroll_approval_history, public.payroll_snapshots, public.payroll_finalization_logs
  to authenticated;

insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

drop policy if exists payslips_storage_select on storage.objects;
create policy payslips_storage_select on storage.objects
  for select using (
    bucket_id = 'payslips'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and (
      public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payroll.payslip.view')
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payslip.export')
    )
  );

drop policy if exists payslips_storage_insert on storage.objects;
create policy payslips_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'payslips'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and (
      public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payslip.generate')
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payroll.process')
    )
  );

drop policy if exists payslips_storage_update on storage.objects;
create policy payslips_storage_update on storage.objects
  for update using (
    bucket_id = 'payslips'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payslip.generate')
  );

-- BSB Payroll Phase 11 — Versioned India statutory and tax engine (PF/ESI/PT/LWF/TDS)
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–10 payroll, payslips, salary, attendance, leave, claims or loans.
-- Phase 9 statutory_rules remain; payroll consumes versioned rules when present.
-- No Phase 4 attendance engine.

alter table public.statutory_rules drop constraint if exists statutory_rules_head_check;
alter table public.statutory_rules add constraint statutory_rules_head_check
  check (head in ('PF', 'ESI', 'PT', 'TDS', 'LWF'));

alter table public.compliance_filings drop constraint if exists compliance_filings_head_check;
alter table public.compliance_filings add constraint compliance_filings_head_check
  check (head in ('PF', 'ESI', 'PT', 'TDS', 'LWF'));

alter table public.employee_statutory add column if not exists lwf_applicable boolean not null default false;
alter table public.employee_statutory add column if not exists tds_applicable boolean not null default true;
alter table public.employee_statutory add column if not exists tax_regime text not null default 'NEW_ACT_2025';
alter table public.employee_statutory add column if not exists pf_number text;
alter table public.employee_statutory add column if not exists pt_state_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employee_statutory_tax_regime_check'
  ) then
    alter table public.employee_statutory
      add constraint employee_statutory_tax_regime_check
      check (tax_regime in ('OLD', 'NEW', 'NEW_ACT_2025'));
  end if;
end $$;

alter table public.payroll_items add column if not exists lwf_employee numeric not null default 0;
alter table public.payroll_items add column if not exists lwf_employer numeric not null default 0;

alter table public.payroll_exceptions drop constraint if exists payroll_exceptions_code_check;
alter table public.payroll_exceptions add constraint payroll_exceptions_code_check
  check (code in (
    'MISSING_SALARY_STRUCTURE',
    'MISSING_ATTENDANCE',
    'UNRESOLVED_ATTENDANCE_EXCEPTION',
    'UNRESOLVED_LEAVE',
    'INVALID_SALARY_PERIOD',
    'DUPLICATE_SOURCE',
    'LOAN_MISMATCH',
    'NEGATIVE_RESULT',
    'INVALID_EMPLOYEE_STATE',
    'OTHER_CALCULATION_ERROR',
    'STATUTORY_RULE_MISSING',
    'STATUTORY_UAN_MISSING',
    'STATUTORY_PAN_MISSING',
    'STATUTORY_UNVERIFIED_RULE'
  ));

create table if not exists public.statutory_rule_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  head text not null check (head in ('PF', 'ESI', 'PT', 'TDS', 'LWF')),
  version_code text not null,
  name text not null,
  jurisdiction text not null default 'INDIA',
  state_code text,
  tax_year text,
  regime text,
  effective_from date not null,
  effective_to date,
  status text not null default 'DISABLED' check (status in ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED')),
  verified boolean not null default false,
  source_name text,
  source_url text,
  source_citation text,
  config_json text not null default '{}',
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, head, version_code)
);

create index if not exists statutory_rule_versions_org_idx
  on public.statutory_rule_versions (organization_id, head, status, effective_from);

create table if not exists public.org_statutory_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  pf_enabled boolean not null default true,
  esi_enabled boolean not null default true,
  pt_enabled boolean not null default true,
  lwf_enabled boolean not null default false,
  tds_enabled boolean not null default false,
  pf_restrict_to_ceiling boolean not null default true,
  default_state_code text,
  tds_default_regime text not null default 'NEW_ACT_2025',
  show_employer_on_payslip boolean not null default true,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_tax_declarations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  tax_year text not null,
  regime text not null default 'NEW_ACT_2025' check (regime in ('OLD', 'NEW', 'NEW_ACT_2025')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  submitted_at timestamptz,
  reviewed_by uuid references public.user_profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, tax_year)
);

create index if not exists employee_tax_declarations_org_idx
  on public.employee_tax_declarations (organization_id, tax_year, status);

create table if not exists public.employee_tax_declaration_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  declaration_id uuid not null references public.employee_tax_declarations (id) on delete cascade,
  section_code text not null,
  name text not null,
  amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_tax_declaration_items_decl_idx
  on public.employee_tax_declaration_items (declaration_id);

create table if not exists public.employee_tax_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  declaration_id uuid not null references public.employee_tax_declarations (id) on delete cascade,
  item_id uuid references public.employee_tax_declaration_items (id) on delete set null,
  employee_id uuid not null references public.employees (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size integer,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.user_profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  uploaded_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_tax_proofs_org_idx
  on public.employee_tax_proofs (organization_id, status);

create table if not exists public.payroll_statutory_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  item_id uuid not null references public.payroll_items (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  period text not null,
  rule_versions_json text not null default '[]',
  pf_wage numeric not null default 0,
  pf_employee numeric not null default 0,
  pf_employer numeric not null default 0,
  pf_eps numeric not null default 0,
  pf_epf numeric not null default 0,
  esi_wage numeric not null default 0,
  esi_employee numeric not null default 0,
  esi_employer numeric not null default 0,
  pt_amount numeric not null default 0,
  pt_state_code text,
  lwf_employee numeric not null default 0,
  lwf_employer numeric not null default 0,
  tds_amount numeric not null default 0,
  tds_regime text,
  taxable_income numeric not null default 0,
  employee_total numeric not null default 0,
  employer_total numeric not null default 0,
  notes_json text,
  created_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index if not exists payroll_statutory_results_run_idx
  on public.payroll_statutory_results (organization_id, run_id);

create table if not exists public.payroll_statutory_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  result_id uuid not null references public.payroll_statutory_results (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  head text not null check (head in ('PF', 'ESI', 'PT', 'TDS', 'LWF')),
  party text not null check (party in ('EMPLOYEE', 'EMPLOYER')),
  code text not null,
  name text not null,
  amount numeric not null default 0,
  wage_base numeric not null default 0,
  rate numeric,
  rule_version_id uuid references public.statutory_rule_versions (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists payroll_statutory_lines_result_idx
  on public.payroll_statutory_lines (result_id, sort_order);

drop trigger if exists statutory_rule_versions_updated_at on public.statutory_rule_versions;
create trigger statutory_rule_versions_updated_at
  before update on public.statutory_rule_versions
  for each row execute function public.set_updated_at();

drop trigger if exists org_statutory_settings_updated_at on public.org_statutory_settings;
create trigger org_statutory_settings_updated_at
  before update on public.org_statutory_settings
  for each row execute function public.set_updated_at();

drop trigger if exists employee_tax_declarations_updated_at on public.employee_tax_declarations;
create trigger employee_tax_declarations_updated_at
  before update on public.employee_tax_declarations
  for each row execute function public.set_updated_at();

drop trigger if exists employee_tax_declaration_items_updated_at on public.employee_tax_declaration_items;
create trigger employee_tax_declaration_items_updated_at
  before update on public.employee_tax_declaration_items
  for each row execute function public.set_updated_at();

drop trigger if exists employee_tax_proofs_updated_at on public.employee_tax_proofs;
create trigger employee_tax_proofs_updated_at
  before update on public.employee_tax_proofs
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('compliance.manage', 'Manage compliance filings', 'Compliance'),
  ('compliance.rules.manage', 'Manage statutory rule versions', 'Compliance'),
  ('compliance.tax.manage', 'Manage tax declarations and TDS', 'Compliance'),
  ('compliance.proofs.review', 'Review tax proofs', 'Compliance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.code in ('compliance.manage', 'compliance.rules.manage', 'compliance.tax.manage', 'compliance.proofs.review')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('compliance.manage', 'compliance.rules.manage', 'compliance.tax.manage', 'compliance.proofs.review')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('compliance.tax.manage', 'compliance.proofs.review')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

alter table public.statutory_rule_versions enable row level security;
alter table public.org_statutory_settings enable row level security;
alter table public.employee_tax_declarations enable row level security;
alter table public.employee_tax_declaration_items enable row level security;
alter table public.employee_tax_proofs enable row level security;
alter table public.payroll_statutory_results enable row level security;
alter table public.payroll_statutory_lines enable row level security;

drop policy if exists statutory_rule_versions_select on public.statutory_rule_versions;
create policy statutory_rule_versions_select on public.statutory_rule_versions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'compliance.view')
  );
drop policy if exists statutory_rule_versions_write on public.statutory_rule_versions;
create policy statutory_rule_versions_write on public.statutory_rule_versions
  for all using (public.has_org_permission(organization_id, 'compliance.rules.manage'))
  with check (public.has_org_permission(organization_id, 'compliance.rules.manage'));

drop policy if exists org_statutory_settings_select on public.org_statutory_settings;
create policy org_statutory_settings_select on public.org_statutory_settings
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'compliance.view')
  );
drop policy if exists org_statutory_settings_write on public.org_statutory_settings;
create policy org_statutory_settings_write on public.org_statutory_settings
  for all using (
    public.has_org_permission(organization_id, 'compliance.manage')
    or public.has_org_permission(organization_id, 'payroll.settings')
  )
  with check (
    public.has_org_permission(organization_id, 'compliance.manage')
    or public.has_org_permission(organization_id, 'payroll.settings')
  );

drop policy if exists employee_tax_declarations_select on public.employee_tax_declarations;
create policy employee_tax_declarations_select on public.employee_tax_declarations
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'compliance.view')
      or public.has_org_permission(organization_id, 'compliance.tax.manage')
    )
  );
drop policy if exists employee_tax_declarations_write on public.employee_tax_declarations;
create policy employee_tax_declarations_write on public.employee_tax_declarations
  for all using (
    public.has_org_permission(organization_id, 'compliance.tax.manage')
    or public.has_org_permission(organization_id, 'employee.edit')
  )
  with check (
    public.has_org_permission(organization_id, 'compliance.tax.manage')
    or public.has_org_permission(organization_id, 'employee.edit')
  );

drop policy if exists employee_tax_declaration_items_select on public.employee_tax_declaration_items;
create policy employee_tax_declaration_items_select on public.employee_tax_declaration_items
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'compliance.view')
      or public.has_org_permission(organization_id, 'compliance.tax.manage')
    )
  );
drop policy if exists employee_tax_declaration_items_write on public.employee_tax_declaration_items;
create policy employee_tax_declaration_items_write on public.employee_tax_declaration_items
  for all using (
    public.has_org_permission(organization_id, 'compliance.tax.manage')
    or public.has_org_permission(organization_id, 'employee.edit')
  )
  with check (
    public.has_org_permission(organization_id, 'compliance.tax.manage')
    or public.has_org_permission(organization_id, 'employee.edit')
  );

drop policy if exists employee_tax_proofs_select on public.employee_tax_proofs;
create policy employee_tax_proofs_select on public.employee_tax_proofs
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'compliance.view')
      or public.has_org_permission(organization_id, 'compliance.proofs.review')
    )
  );
drop policy if exists employee_tax_proofs_write on public.employee_tax_proofs;
create policy employee_tax_proofs_write on public.employee_tax_proofs
  for all using (
    public.has_org_permission(organization_id, 'compliance.proofs.review')
    or public.has_org_permission(organization_id, 'compliance.tax.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'compliance.proofs.review')
    or public.has_org_permission(organization_id, 'compliance.tax.manage')
  );

drop policy if exists payroll_statutory_results_select on public.payroll_statutory_results;
create policy payroll_statutory_results_select on public.payroll_statutory_results
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'payroll.view')
      or public.has_org_permission(organization_id, 'compliance.view')
    )
  );
drop policy if exists payroll_statutory_results_write on public.payroll_statutory_results;
create policy payroll_statutory_results_write on public.payroll_statutory_results
  for all using (public.has_org_permission(organization_id, 'payroll.process'))
  with check (public.has_org_permission(organization_id, 'payroll.process'));

drop policy if exists payroll_statutory_lines_select on public.payroll_statutory_lines;
create policy payroll_statutory_lines_select on public.payroll_statutory_lines
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      public.has_org_permission(organization_id, 'payroll.view')
      or public.has_org_permission(organization_id, 'compliance.view')
    )
  );
drop policy if exists payroll_statutory_lines_write on public.payroll_statutory_lines;
create policy payroll_statutory_lines_write on public.payroll_statutory_lines
  for all using (public.has_org_permission(organization_id, 'payroll.process'))
  with check (public.has_org_permission(organization_id, 'payroll.process'));

grant select, insert, update on public.statutory_rule_versions, public.org_statutory_settings,
  public.employee_tax_declarations, public.employee_tax_declaration_items, public.employee_tax_proofs,
  public.payroll_statutory_results, public.payroll_statutory_lines
  to authenticated;

insert into storage.buckets (id, name, public)
values ('tax-proofs', 'tax-proofs', false)
on conflict (id) do nothing;

drop policy if exists tax_proofs_storage_select on storage.objects;
create policy tax_proofs_storage_select on storage.objects
  for select using (
    bucket_id = 'tax-proofs'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and (
      public.has_org_permission(((storage.foldername(name))[1])::uuid, 'compliance.view')
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'compliance.proofs.review')
    )
  );

drop policy if exists tax_proofs_storage_insert on storage.objects;
create policy tax_proofs_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'tax-proofs'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and (
      public.has_org_permission(((storage.foldername(name))[1])::uuid, 'compliance.tax.manage')
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'employee.edit')
    )
  );

-- BSB Payroll Phase 12 — Employee exit, full & final settlement, contractor payroll
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–11 modules.
-- No Phase 4 attendance engine.

create table if not exists public.exit_clearance_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  department text not null check (department in ('HR', 'FINANCE', 'IT', 'ADMIN', 'MANAGER')),
  code text not null,
  name text not null,
  description text,
  required boolean not null default true,
  default_due_days integer not null default 7,
  sort_order integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists exit_clearance_items_org_idx
  on public.exit_clearance_items (organization_id, status, department);

create table if not exists public.employee_exits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  reference_number text,
  exit_type text not null check (exit_type in ('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'CONTRACT_EXPIRY', 'OTHER')),
  notice_date date not null,
  last_working_date date not null,
  notice_period_days integer not null default 0,
  notice_served_days integer not null default 0,
  reason text,
  remarks text,
  attachment_name text,
  approver_id uuid references public.user_profiles (id) on delete set null,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'SUBMITTED', 'APPROVED', 'IN_NOTICE', 'CLEARANCE_PENDING',
    'SETTLEMENT_PENDING', 'SETTLED', 'CANCELLED'
  )),
  submitted_at timestamptz,
  approved_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_exits_org_ref_uidx
  on public.employee_exits (organization_id, reference_number)
  where reference_number is not null;

create index if not exists employee_exits_org_idx
  on public.employee_exits (organization_id, status, last_working_date);

create index if not exists employee_exits_employee_idx
  on public.employee_exits (employee_id, status);

create table if not exists public.exit_clearance_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  exit_id uuid not null references public.employee_exits (id) on delete cascade,
  item_id uuid references public.exit_clearance_items (id) on delete set null,
  department text not null check (department in ('HR', 'FINANCE', 'IT', 'ADMIN', 'MANAGER')),
  name text not null,
  required boolean not null default true,
  owner_id uuid references public.user_profiles (id) on delete set null,
  due_date date,
  status text not null default 'PENDING' check (status in ('PENDING', 'CLEARED', 'BLOCKED', 'NOT_APPLICABLE')),
  remarks text,
  completed_by uuid references public.user_profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exit_clearance_tasks_exit_idx
  on public.exit_clearance_tasks (organization_id, exit_id, status);

create table if not exists public.final_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  exit_id uuid not null references public.employee_exits (id) on delete restrict,
  employee_id uuid not null references public.employees (id) on delete restrict,
  reference_number text,
  period text not null,
  period_from date not null,
  period_to date not null,
  last_working_date date not null,
  working_days numeric not null default 0,
  paid_days numeric not null default 0,
  lop_days numeric not null default 0,
  earnings_total numeric not null default 0,
  reimbursement_total numeric not null default 0,
  encashment_total numeric not null default 0,
  recovery_total numeric not null default 0,
  deduction_total numeric not null default 0,
  statutory_employee_total numeric not null default 0,
  statutory_employer_total numeric not null default 0,
  adjustment_total numeric not null default 0,
  gross_payable numeric not null default 0,
  net_payable numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'CALCULATED', 'HAS_EXCEPTIONS', 'UNDER_REVIEW', 'APPROVED',
    'FINALIZED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'
  )),
  exceptions_json text,
  snapshot_json text,
  document_path text,
  calculated_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists final_settlements_org_ref_uidx
  on public.final_settlements (organization_id, reference_number)
  where reference_number is not null;

create index if not exists final_settlements_org_idx
  on public.final_settlements (organization_id, status);

create unique index if not exists final_settlements_active_exit_uidx
  on public.final_settlements (exit_id)
  where status <> 'CANCELLED';

create table if not exists public.settlement_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  settlement_id uuid not null references public.final_settlements (id) on delete cascade,
  kind text not null check (kind in (
    'UNPAID_SALARY', 'VARIABLE_EARNING', 'BONUS', 'ARREAR', 'REIMBURSEMENT',
    'LEAVE_ENCASHMENT', 'NOTICE_PAY', 'NOTICE_RECOVERY', 'LOAN_RECOVERY',
    'STATUTORY', 'EMPLOYER_STATUTORY', 'ADJUSTMENT'
  )),
  direction text not null check (direction in ('EARNING', 'DEDUCTION', 'EMPLOYER')),
  code text not null,
  name text not null,
  amount numeric not null default 0,
  source_type text,
  source_id uuid,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists settlement_line_items_settlement_idx
  on public.settlement_line_items (settlement_id, sort_order);

create table if not exists public.settlement_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  settlement_id uuid not null references public.final_settlements (id) on delete cascade,
  step text not null default 'REVIEW' check (step in ('REVIEW', 'APPROVAL', 'FINALIZE', 'REJECT', 'ADJUST')),
  decision text not null check (decision in ('APPROVED', 'REJECTED', 'RETURNED')),
  reason text,
  actor_id uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists settlement_approvals_settlement_idx
  on public.settlement_approvals (settlement_id, created_at);

create table if not exists public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  settlement_id uuid not null references public.final_settlements (id) on delete cascade,
  amount numeric not null,
  payment_date date not null,
  method text not null check (method in ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'OTHER')),
  reference text,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists settlement_payments_settlement_idx
  on public.settlement_payments (settlement_id, payment_date);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contractor_code text not null,
  legal_name text not null,
  display_name text not null,
  business_type text not null default 'INDIVIDUAL' check (business_type in ('INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'COMPANY', 'LLP', 'OTHER')),
  pan text,
  gstin text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pin text,
  bank_name text,
  account_number text,
  ifsc text,
  reporting_manager_id uuid references public.employees (id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'BLACKLISTED')),
  notes text,
  document_name text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contractor_code)
);

create index if not exists contractors_org_idx
  on public.contractors (organization_id, status);

create table if not exists public.contractor_engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contractor_id uuid not null references public.contractors (id) on delete restrict,
  reference_number text,
  scope text not null,
  start_date date not null,
  end_date date,
  fee_amount numeric not null default 0,
  rate_unit text not null default 'MONTHLY' check (rate_unit in ('MONTHLY', 'DAILY', 'HOURLY', 'MILESTONE', 'ONE_TIME')),
  payment_frequency text not null default 'MONTHLY' check (payment_frequency in ('MONTHLY', 'MILESTONE', 'ONE_TIME')),
  invoice_terms text,
  approver_id uuid references public.user_profiles (id) on delete set null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'EXPIRED', 'CLOSED', 'CANCELLED')),
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contractor_engagements_org_idx
  on public.contractor_engagements (organization_id, contractor_id, status, end_date);

create table if not exists public.contractor_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contractor_id uuid not null references public.contractors (id) on delete restrict,
  engagement_id uuid references public.contractor_engagements (id) on delete set null,
  invoice_number text not null,
  invoice_date date not null,
  service_from date not null,
  service_to date not null,
  due_date date,
  gross_amount numeric not null default 0,
  adjustment_amount numeric not null default 0,
  withholding_amount numeric not null default 0,
  net_payable numeric not null default 0,
  withholding_basis numeric not null default 0,
  withholding_section text,
  rule_version_id uuid references public.statutory_rule_versions (id) on delete set null,
  rule_version_code text,
  duplicate_override_reason text,
  attachment_name text,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
    'SCHEDULED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'
  )),
  reject_reason text,
  paid_amount numeric not null default 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contractor_invoices_org_number_uidx
  on public.contractor_invoices (organization_id, contractor_id, invoice_number)
  where status <> 'CANCELLED';

create index if not exists contractor_invoices_org_idx
  on public.contractor_invoices (organization_id, status, invoice_date);

create table if not exists public.contractor_payment_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.contractor_invoices (id) on delete cascade,
  kind text not null check (kind in ('GROSS', 'ADJUSTMENT', 'WITHHOLDING', 'NET')),
  name text not null,
  amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists contractor_payment_items_invoice_idx
  on public.contractor_payment_items (invoice_id);

create table if not exists public.contractor_payment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.contractor_invoices (id) on delete cascade,
  amount numeric not null,
  payment_date date not null,
  method text not null check (method in ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'OTHER')),
  reference text,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists contractor_payment_records_invoice_idx
  on public.contractor_payment_records (invoice_id, payment_date);

drop trigger if exists exit_clearance_items_updated_at on public.exit_clearance_items;
create trigger exit_clearance_items_updated_at
  before update on public.exit_clearance_items
  for each row execute function public.set_updated_at();

drop trigger if exists employee_exits_updated_at on public.employee_exits;
create trigger employee_exits_updated_at
  before update on public.employee_exits
  for each row execute function public.set_updated_at();

drop trigger if exists exit_clearance_tasks_updated_at on public.exit_clearance_tasks;
create trigger exit_clearance_tasks_updated_at
  before update on public.exit_clearance_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists final_settlements_updated_at on public.final_settlements;
create trigger final_settlements_updated_at
  before update on public.final_settlements
  for each row execute function public.set_updated_at();

drop trigger if exists contractors_updated_at on public.contractors;
create trigger contractors_updated_at
  before update on public.contractors
  for each row execute function public.set_updated_at();

drop trigger if exists contractor_engagements_updated_at on public.contractor_engagements;
create trigger contractor_engagements_updated_at
  before update on public.contractor_engagements
  for each row execute function public.set_updated_at();

drop trigger if exists contractor_invoices_updated_at on public.contractor_invoices;
create trigger contractor_invoices_updated_at
  before update on public.contractor_invoices
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('exits.view', 'View employee exits', 'Exits'),
  ('exits.create', 'Create employee exits', 'Exits'),
  ('exits.edit', 'Edit employee exits', 'Exits'),
  ('exits.approve', 'Approve employee exits', 'Exits'),
  ('exits.cancel', 'Cancel employee exits', 'Exits'),
  ('exits.export', 'Export employee exits', 'Exits'),
  ('clearance.view', 'View exit clearance', 'Exits'),
  ('clearance.manage', 'Manage exit clearance', 'Exits'),
  ('settlements.view', 'View settlements', 'Settlements'),
  ('settlements.calculate', 'Calculate settlements', 'Settlements'),
  ('settlements.review', 'Review settlements', 'Settlements'),
  ('settlements.approve', 'Approve settlements', 'Settlements'),
  ('settlements.finalize', 'Finalize settlements', 'Settlements'),
  ('settlements.pay', 'Record settlement payments', 'Settlements'),
  ('settlements.adjust', 'Adjust settlements', 'Settlements'),
  ('settlements.export', 'Export settlements', 'Settlements'),
  ('contractors.view', 'View contractors', 'Contractors'),
  ('contractors.manage', 'Manage contractors', 'Contractors'),
  ('contractors.engagements.manage', 'Manage contractor engagements', 'Contractors'),
  ('contractors.invoices.create', 'Create contractor invoices', 'Contractors'),
  ('contractors.invoices.approve', 'Approve contractor invoices', 'Contractors'),
  ('contractors.pay', 'Record contractor payments', 'Contractors'),
  ('contractors.withholding.manage', 'Manage contractor withholding', 'Contractors'),
  ('contractors.export', 'Export contractor data', 'Contractors')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name in ('Exits', 'Settlements', 'Contractors')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.group_name in ('Exits', 'Settlements', 'Contractors')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'exits.view', 'exits.export', 'clearance.view',
  'settlements.view', 'settlements.calculate', 'settlements.export',
  'contractors.view', 'contractors.export'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'exits.view', 'clearance.view',
  'settlements.view', 'settlements.review', 'settlements.approve',
  'settlements.finalize', 'settlements.pay', 'settlements.export',
  'contractors.view', 'contractors.invoices.create', 'contractors.invoices.approve',
  'contractors.pay', 'contractors.withholding.manage', 'contractors.export'
)
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'exits.view', 'exits.approve', 'clearance.view', 'clearance.manage', 'contractors.view'
)
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

alter table public.exit_clearance_items enable row level security;
alter table public.employee_exits enable row level security;
alter table public.exit_clearance_tasks enable row level security;
alter table public.final_settlements enable row level security;
alter table public.settlement_line_items enable row level security;
alter table public.settlement_approvals enable row level security;
alter table public.settlement_payments enable row level security;
alter table public.contractors enable row level security;
alter table public.contractor_engagements enable row level security;
alter table public.contractor_invoices enable row level security;
alter table public.contractor_payment_items enable row level security;
alter table public.contractor_payment_records enable row level security;

drop policy if exists exit_clearance_items_select on public.exit_clearance_items;
create policy exit_clearance_items_select on public.exit_clearance_items
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'exits.view') or public.has_org_permission(organization_id, 'clearance.view'))
  );
drop policy if exists exit_clearance_items_write on public.exit_clearance_items;
create policy exit_clearance_items_write on public.exit_clearance_items
  for all using (public.has_org_permission(organization_id, 'clearance.manage'))
  with check (public.has_org_permission(organization_id, 'clearance.manage'));

drop policy if exists employee_exits_select on public.employee_exits;
create policy employee_exits_select on public.employee_exits
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'exits.view')
  );
drop policy if exists employee_exits_write on public.employee_exits;
create policy employee_exits_write on public.employee_exits
  for all using (
    public.has_org_permission(organization_id, 'exits.create')
    or public.has_org_permission(organization_id, 'exits.edit')
    or public.has_org_permission(organization_id, 'exits.approve')
  )
  with check (
    public.has_org_permission(organization_id, 'exits.create')
    or public.has_org_permission(organization_id, 'exits.edit')
    or public.has_org_permission(organization_id, 'exits.approve')
  );

drop policy if exists exit_clearance_tasks_select on public.exit_clearance_tasks;
create policy exit_clearance_tasks_select on public.exit_clearance_tasks
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'clearance.view') or public.has_org_permission(organization_id, 'exits.view'))
  );
drop policy if exists exit_clearance_tasks_write on public.exit_clearance_tasks;
create policy exit_clearance_tasks_write on public.exit_clearance_tasks
  for all using (public.has_org_permission(organization_id, 'clearance.manage'))
  with check (public.has_org_permission(organization_id, 'clearance.manage'));

drop policy if exists final_settlements_select on public.final_settlements;
create policy final_settlements_select on public.final_settlements
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'settlements.view')
  );
drop policy if exists final_settlements_write on public.final_settlements;
create policy final_settlements_write on public.final_settlements
  for all using (
    public.has_org_permission(organization_id, 'settlements.calculate')
    or public.has_org_permission(organization_id, 'settlements.approve')
    or public.has_org_permission(organization_id, 'settlements.finalize')
    or public.has_org_permission(organization_id, 'settlements.pay')
  )
  with check (
    public.has_org_permission(organization_id, 'settlements.calculate')
    or public.has_org_permission(organization_id, 'settlements.approve')
    or public.has_org_permission(organization_id, 'settlements.finalize')
    or public.has_org_permission(organization_id, 'settlements.pay')
  );

drop policy if exists settlement_line_items_select on public.settlement_line_items;
create policy settlement_line_items_select on public.settlement_line_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'settlements.view')
  );
drop policy if exists settlement_line_items_write on public.settlement_line_items;
create policy settlement_line_items_write on public.settlement_line_items
  for all using (
    public.has_org_permission(organization_id, 'settlements.calculate')
    or public.has_org_permission(organization_id, 'settlements.adjust')
  )
  with check (
    public.has_org_permission(organization_id, 'settlements.calculate')
    or public.has_org_permission(organization_id, 'settlements.adjust')
  );

drop policy if exists settlement_approvals_select on public.settlement_approvals;
create policy settlement_approvals_select on public.settlement_approvals
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'settlements.view')
  );
drop policy if exists settlement_approvals_write on public.settlement_approvals;
create policy settlement_approvals_write on public.settlement_approvals
  for all using (
    public.has_org_permission(organization_id, 'settlements.review')
    or public.has_org_permission(organization_id, 'settlements.approve')
    or public.has_org_permission(organization_id, 'settlements.finalize')
  )
  with check (
    public.has_org_permission(organization_id, 'settlements.review')
    or public.has_org_permission(organization_id, 'settlements.approve')
    or public.has_org_permission(organization_id, 'settlements.finalize')
  );

drop policy if exists settlement_payments_select on public.settlement_payments;
create policy settlement_payments_select on public.settlement_payments
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'settlements.view')
  );
drop policy if exists settlement_payments_write on public.settlement_payments;
create policy settlement_payments_write on public.settlement_payments
  for all using (public.has_org_permission(organization_id, 'settlements.pay'))
  with check (public.has_org_permission(organization_id, 'settlements.pay'));

drop policy if exists contractors_select on public.contractors;
create policy contractors_select on public.contractors
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'contractors.view')
  );
drop policy if exists contractors_write on public.contractors;
create policy contractors_write on public.contractors
  for all using (public.has_org_permission(organization_id, 'contractors.manage'))
  with check (public.has_org_permission(organization_id, 'contractors.manage'));

drop policy if exists contractor_engagements_select on public.contractor_engagements;
create policy contractor_engagements_select on public.contractor_engagements
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'contractors.view')
  );
drop policy if exists contractor_engagements_write on public.contractor_engagements;
create policy contractor_engagements_write on public.contractor_engagements
  for all using (public.has_org_permission(organization_id, 'contractors.engagements.manage'))
  with check (public.has_org_permission(organization_id, 'contractors.engagements.manage'));

drop policy if exists contractor_invoices_select on public.contractor_invoices;
create policy contractor_invoices_select on public.contractor_invoices
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'contractors.view')
  );
drop policy if exists contractor_invoices_write on public.contractor_invoices;
create policy contractor_invoices_write on public.contractor_invoices
  for all using (
    public.has_org_permission(organization_id, 'contractors.invoices.create')
    or public.has_org_permission(organization_id, 'contractors.invoices.approve')
    or public.has_org_permission(organization_id, 'contractors.pay')
  )
  with check (
    public.has_org_permission(organization_id, 'contractors.invoices.create')
    or public.has_org_permission(organization_id, 'contractors.invoices.approve')
    or public.has_org_permission(organization_id, 'contractors.pay')
  );

drop policy if exists contractor_payment_items_select on public.contractor_payment_items;
create policy contractor_payment_items_select on public.contractor_payment_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'contractors.view')
  );
drop policy if exists contractor_payment_items_write on public.contractor_payment_items;
create policy contractor_payment_items_write on public.contractor_payment_items
  for all using (
    public.has_org_permission(organization_id, 'contractors.invoices.create')
    or public.has_org_permission(organization_id, 'contractors.withholding.manage')
  )
  with check (
    public.has_org_permission(organization_id, 'contractors.invoices.create')
    or public.has_org_permission(organization_id, 'contractors.withholding.manage')
  );

drop policy if exists contractor_payment_records_select on public.contractor_payment_records;
create policy contractor_payment_records_select on public.contractor_payment_records
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'contractors.view')
  );
drop policy if exists contractor_payment_records_write on public.contractor_payment_records;
create policy contractor_payment_records_write on public.contractor_payment_records
  for all using (public.has_org_permission(organization_id, 'contractors.pay'))
  with check (public.has_org_permission(organization_id, 'contractors.pay'));

grant select, insert, update on public.exit_clearance_items, public.employee_exits, public.exit_clearance_tasks,
  public.final_settlements, public.settlement_line_items, public.settlement_approvals, public.settlement_payments,
  public.contractors, public.contractor_engagements, public.contractor_invoices, public.contractor_payment_items,
  public.contractor_payment_records
  to authenticated;

insert into storage.buckets (id, name, public)
values ('settlement-statements', 'settlement-statements', false)
on conflict (id) do nothing;

drop policy if exists settlement_statements_storage_select on storage.objects;
create policy settlement_statements_storage_select on storage.objects
  for select using (
    bucket_id = 'settlement-statements'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'settlements.view')
  );

drop policy if exists settlement_statements_storage_insert on storage.objects;
create policy settlement_statements_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'settlement-statements'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'settlements.finalize')
  );


-- ---------------------------------------------------------------------------
-- Phase 13 — Employee Self-Service (ESS) portal
-- ---------------------------------------------------------------------------
-- BSB Payroll Phase 13 — Employee Self-Service (ESS) portal
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–12 modules.
-- No attendance engine, no QR/GPS/face recognition. Identity is always server-resolved.

create or replace function public.current_employee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where user_id = public.current_profile_id();
$$;

create table if not exists public.ess_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  type text not null default 'INFO' check (type in ('INFO', 'ACTION', 'APPROVAL', 'ALERT')),
  title text not null,
  body text,
  href text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ess_notifications_user_idx
  on public.ess_notifications (user_id, read_at, created_at desc);

create index if not exists ess_notifications_org_idx
  on public.ess_notifications (organization_id, created_at desc);

create table if not exists public.ess_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  requested_by uuid not null references public.user_profiles (id) on delete cascade,
  category text not null check (category in (
    'CONTACT', 'ADDRESS', 'EMERGENCY', 'BANK', 'STATUTORY', 'EDUCATION', 'OTHER'
  )),
  field_key text not null,
  current_value text,
  requested_value text not null,
  reason text,
  status text not null default 'PENDING' check (status in (
    'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  )),
  reviewer_id uuid references public.user_profiles (id) on delete set null,
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ess_change_requests_org_idx
  on public.ess_change_requests (organization_id, status, created_at desc);

create index if not exists ess_change_requests_employee_idx
  on public.ess_change_requests (employee_id, status);

drop trigger if exists ess_change_requests_updated_at on public.ess_change_requests;
create trigger ess_change_requests_updated_at
  before update on public.ess_change_requests
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('self.view', 'Access self-service portal', 'Self Service'),
  ('self.profile.update', 'Request profile changes', 'Self Service'),
  ('self.change_request.review', 'Review profile change requests', 'Self Service'),
  ('self.notifications.manage', 'Send self-service notifications', 'Self Service')
on conflict (code) do nothing;

-- SUPER_ADMIN and ADMIN already receive every permission via seed, but keep this
-- idempotent grant so the ESS group is present for environments seeded before it.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Self Service'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'self.view', 'self.profile.update', 'self.change_request.review', 'self.notifications.manage'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'self.view', 'self.profile.update', 'self.notifications.manage'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('self.view', 'self.profile.update')
where r.organization_id is null and r.code in ('ACCOUNTANT', 'MANAGER', 'EMPLOYEE')
on conflict (role_id, permission_id) do nothing;

alter table public.ess_notifications enable row level security;
alter table public.ess_change_requests enable row level security;

drop policy if exists ess_notifications_select on public.ess_notifications;
create policy ess_notifications_select on public.ess_notifications
  for select using (user_id = public.current_profile_id());

drop policy if exists ess_notifications_update on public.ess_notifications;
create policy ess_notifications_update on public.ess_notifications
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists ess_notifications_insert on public.ess_notifications;
create policy ess_notifications_insert on public.ess_notifications
  for insert with check (
    public.has_org_permission(organization_id, 'self.notifications.manage')
    or user_id = public.current_profile_id()
  );

drop policy if exists ess_change_requests_select on public.ess_change_requests;
create policy ess_change_requests_select on public.ess_change_requests
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      employee_id in (select public.current_employee_ids())
      or public.has_org_permission(organization_id, 'self.change_request.review')
    )
  );

drop policy if exists ess_change_requests_insert on public.ess_change_requests;
create policy ess_change_requests_insert on public.ess_change_requests
  for insert with check (
    organization_id in (select public.current_org_ids())
    and employee_id in (select public.current_employee_ids())
    and requested_by = public.current_profile_id()
  );

drop policy if exists ess_change_requests_update on public.ess_change_requests;
create policy ess_change_requests_update on public.ess_change_requests
  for update using (
    organization_id in (select public.current_org_ids())
    and (
      employee_id in (select public.current_employee_ids())
      or public.has_org_permission(organization_id, 'self.change_request.review')
    )
  )
  with check (
    organization_id in (select public.current_org_ids())
    and (
      employee_id in (select public.current_employee_ids())
      or public.has_org_permission(organization_id, 'self.change_request.review')
    )
  );

grant select, insert, update on public.ess_notifications, public.ess_change_requests
  to authenticated;
