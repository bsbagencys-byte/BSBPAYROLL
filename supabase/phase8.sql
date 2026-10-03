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
