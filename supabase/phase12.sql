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
