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
