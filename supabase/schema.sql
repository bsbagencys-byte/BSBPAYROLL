-- BSB Payroll Phase 1 schema
-- Apply in the Supabase SQL editor (or via supabase db push).
-- Service role bypasses RLS. Never expose that key to the client.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Helpers
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
  is_default boolean not null default false,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designations_org_idx on public.designations (organization_id);

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

-- Username lookup used by auth mapping. RLS-restricted.
create table if not exists public.username_lookup (
  username citext primary key,
  auth_email text not null,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

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

-- ---------------------------------------------------------------------------
-- Seed permissions + system roles (global, organization_id is null)
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_name) values
  ('organization.view', 'View organization', 'Organization'),
  ('organization.edit', 'Edit organization', 'Organization'),
  ('user.view', 'View users', 'Users'),
  ('user.create', 'Create users', 'Users'),
  ('user.edit', 'Edit users', 'Users'),
  ('user.disable', 'Disable users', 'Users'),
  ('employee.view', 'View employees', 'Employees'),
  ('employee.create', 'Create employees', 'Employees'),
  ('employee.edit', 'Edit employees', 'Employees'),
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

-- Attach default permissions to system roles
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
  'employee.view','employee.create','employee.edit','attendance.view','settings.manage'
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

-- organizations
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select using (id in (select public.current_org_ids()));

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update using (public.has_org_permission(id, 'organization.edit'));

drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations
  for insert with check (auth.role() = 'authenticated');

-- user_profiles: a user can see themselves and users in their orgs
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

-- roles / permissions (readable by org members; system roles are global)
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

-- branches / departments / designations
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all using (public.has_org_permission(organization_id, 'settings.manage'));

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for all using (public.has_org_permission(organization_id, 'settings.manage'));

drop policy if exists designations_select on public.designations;
create policy designations_select on public.designations
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists designations_write on public.designations;
create policy designations_write on public.designations
  for all using (public.has_org_permission(organization_id, 'settings.manage'));

-- organization_users
drop policy if exists org_users_select on public.organization_users;
create policy org_users_select on public.organization_users
  for select using (organization_id in (select public.current_org_ids()));

drop policy if exists org_users_write on public.organization_users;
create policy org_users_write on public.organization_users
  for all using (public.has_org_permission(organization_id, 'user.edit'));

-- audit logs: members can read their org; inserts via service role / security definer
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select using (
    organization_id in (select public.current_org_ids())
    or actor_user_id = public.current_profile_id()
  );

drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert with check (auth.role() = 'authenticated');

-- login_attempts: no client access
drop policy if exists login_attempts_none on public.login_attempts;
create policy login_attempts_none on public.login_attempts
  for all using (false);

-- username_lookup: no client access (server uses service role)
drop policy if exists username_lookup_none on public.username_lookup;
create policy username_lookup_none on public.username_lookup
  for all using (false);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
grant select, insert, update on public.branches, public.departments, public.designations to authenticated;
grant select, insert, update on public.organization_users to authenticated;
grant select, insert on public.audit_logs to authenticated;
