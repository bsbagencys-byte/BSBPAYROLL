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
