-- BSB Payroll Phase 2 — Employee & Organization Management
-- Apply after supabase/schema.sql. Additive only.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_name) values
  ('employee.disable', 'Disable employees', 'Employees'),
  ('employee.documents', 'Manage employee documents', 'Employees'),
  ('employee.import', 'Import employees', 'Employees'),
  ('organization.branch.manage', 'Manage branches', 'Organization'),
  ('organization.department.manage', 'Manage departments', 'Organization'),
  ('organization.designation.manage', 'Manage designations', 'Organization')
on conflict (code) do nothing;

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
  'employee.view','employee.create','employee.edit','employee.disable',
  'employee.documents','employee.import',
  'organization.branch.manage','organization.department.manage','organization.designation.manage',
  'settings.manage'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

-- ---------------------------------------------------------------------------
-- Extend existing org structure tables
-- ---------------------------------------------------------------------------
alter table public.branches
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pin text,
  add column if not exists phone text,
  add column if not exists email text;

alter table public.departments
  add column if not exists manager_employee_id uuid;

alter table public.designations
  add column if not exists department_id uuid references public.departments (id) on delete set null;

create index if not exists designations_department_idx on public.designations (department_id);

-- ---------------------------------------------------------------------------
-- Locations
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

drop trigger if exists locations_updated_at on public.locations;
create trigger locations_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Employment types
-- ---------------------------------------------------------------------------
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

drop trigger if exists employment_types_updated_at on public.employment_types;
create trigger employment_types_updated_at
  before update on public.employment_types
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
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

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

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

drop trigger if exists employee_addresses_updated_at on public.employee_addresses;
create trigger employee_addresses_updated_at
  before update on public.employee_addresses
  for each row execute function public.set_updated_at();

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

drop trigger if exists employee_employment_updated_at on public.employee_employment;
create trigger employee_employment_updated_at
  before update on public.employee_employment
  for each row execute function public.set_updated_at();

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

drop trigger if exists employee_statutory_updated_at on public.employee_statutory;
create trigger employee_statutory_updated_at
  before update on public.employee_statutory
  for each row execute function public.set_updated_at();

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

drop trigger if exists employee_bank_accounts_updated_at on public.employee_bank_accounts;
create trigger employee_bank_accounts_updated_at
  before update on public.employee_bank_accounts
  for each row execute function public.set_updated_at();

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
-- RLS
-- ---------------------------------------------------------------------------
alter table public.locations enable row level security;
alter table public.employment_types enable row level security;
alter table public.employees enable row level security;
alter table public.employee_addresses enable row level security;
alter table public.employee_employment enable row level security;
alter table public.employee_statutory enable row level security;
alter table public.employee_bank_accounts enable row level security;
alter table public.employee_documents enable row level security;
alter table public.employee_history enable row level security;

drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select using (organization_id in (select public.current_org_ids()));
drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations
  for all using (public.has_org_permission(organization_id, 'settings.manage'));

drop policy if exists employment_types_select on public.employment_types;
create policy employment_types_select on public.employment_types
  for select using (organization_id in (select public.current_org_ids()));
drop policy if exists employment_types_write on public.employment_types;
create policy employment_types_write on public.employment_types
  for all using (public.has_org_permission(organization_id, 'settings.manage'));

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
  for all using (public.has_org_permission(organization_id, 'employee.edit'));

drop policy if exists employee_employment_select on public.employee_employment;
create policy employee_employment_select on public.employee_employment
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );
drop policy if exists employee_employment_write on public.employee_employment;
create policy employee_employment_write on public.employee_employment
  for all using (public.has_org_permission(organization_id, 'employee.edit'));

drop policy if exists employee_statutory_select on public.employee_statutory;
create policy employee_statutory_select on public.employee_statutory
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );
drop policy if exists employee_statutory_write on public.employee_statutory;
create policy employee_statutory_write on public.employee_statutory
  for all using (public.has_org_permission(organization_id, 'employee.edit'));

drop policy if exists employee_bank_select on public.employee_bank_accounts;
create policy employee_bank_select on public.employee_bank_accounts
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );
drop policy if exists employee_bank_write on public.employee_bank_accounts;
create policy employee_bank_write on public.employee_bank_accounts
  for all using (public.has_org_permission(organization_id, 'employee.edit'));

drop policy if exists employee_documents_select on public.employee_documents;
create policy employee_documents_select on public.employee_documents
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.documents')
  );
drop policy if exists employee_documents_write on public.employee_documents;
create policy employee_documents_write on public.employee_documents
  for all using (public.has_org_permission(organization_id, 'employee.documents'));

drop policy if exists employee_history_select on public.employee_history;
create policy employee_history_select on public.employee_history
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'employee.view')
  );
drop policy if exists employee_history_insert on public.employee_history;
create policy employee_history_insert on public.employee_history
  for insert with check (public.has_org_permission(organization_id, 'employee.edit'));

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
