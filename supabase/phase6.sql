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
