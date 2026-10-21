-- BSB Payroll Phase 14 — Reports, accounting exports and salary payment batches
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–13 modules.
-- No Phase 4 attendance engine. Bank files are exports only; they do not confirm payment.

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists accounting_accounts_org_idx
  on public.accounting_accounts (organization_id, status, account_type);

create table if not exists public.payroll_account_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null check (category in (
    'EARNING', 'EMPLOYER_CONTRIBUTION', 'DEDUCTION', 'REIMBURSEMENT', 'LOAN_RECOVERY', 'NET_PAY'
  )),
  component_code text,
  ledger_account_id uuid not null references public.accounting_accounts (id) on delete restrict,
  treatment text not null check (treatment in ('DEBIT', 'CREDIT')),
  branch_id uuid references public.branches (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payroll_account_mappings_scope_uidx
  on public.payroll_account_mappings (
    organization_id,
    category,
    coalesce(component_code, ''),
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
    effective_from
  );

create index if not exists payroll_account_mappings_org_idx
  on public.payroll_account_mappings (organization_id, category, active, effective_from);

create table if not exists public.payroll_journals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete restrict,
  period text not null,
  journal_date date not null,
  reference_number text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'VALIDATED', 'EXPORTED', 'VOID')),
  total_debit numeric(14, 2) not null default 0,
  total_credit numeric(14, 2) not null default 0,
  balanced boolean not null default false,
  validation_json text,
  export_count integer not null default 0,
  created_by uuid references public.user_profiles (id) on delete set null,
  validated_at timestamptz,
  exported_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference_number)
);

create unique index if not exists payroll_journals_run_uidx
  on public.payroll_journals (organization_id, run_id)
  where status <> 'VOID';

create index if not exists payroll_journals_org_idx
  on public.payroll_journals (organization_id, status, period);

create table if not exists public.payroll_journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  journal_id uuid not null references public.payroll_journals (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  account_id uuid references public.accounting_accounts (id) on delete set null,
  account_code text not null,
  account_name text not null,
  branch_id uuid references public.branches (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  description text not null,
  debit numeric(14, 2) not null default 0,
  credit numeric(14, 2) not null default 0,
  source_kind text not null,
  source_code text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check (debit = 0 or credit = 0)
);

create index if not exists payroll_journal_lines_journal_idx
  on public.payroll_journal_lines (journal_id, sort_order);

create table if not exists public.accounting_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('JOURNAL', 'PAYMENT_BANK_FILE')),
  journal_id uuid references public.payroll_journals (id) on delete set null,
  format text not null default 'CSV' check (format in ('CSV')),
  reference text,
  row_count integer not null default 0,
  duplicate_of uuid references public.accounting_exports (id) on delete set null,
  storage_path text,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists accounting_exports_org_idx
  on public.accounting_exports (organization_id, kind, created_at desc);

create table if not exists public.payment_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  default_method text not null default 'NEFT' check (default_method in (
    'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH', 'UPI'
  )),
  bank_account_reference text,
  file_prefix text not null default 'salary-payment',
  delimiter text not null default ',',
  include_header boolean not null default true,
  columns_json text not null default '[]',
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.payroll_runs (id) on delete restrict,
  period text not null,
  payment_date date not null,
  payment_method text not null check (payment_method in (
    'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH', 'UPI'
  )),
  bank_account_reference text,
  total_employees integer not null default 0,
  total_amount numeric(14, 2) not null default 0,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'VALIDATING', 'READY', 'APPROVED', 'EXPORTED', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'CANCELLED'
  )),
  validation_json text,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  approved_by uuid references public.user_profiles (id) on delete set null,
  approved_at timestamptz,
  exported_at timestamptz,
  export_count integer not null default 0,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_batches_active_run_uidx
  on public.payment_batches (organization_id, run_id)
  where status not in ('FAILED', 'CANCELLED');

create index if not exists payment_batches_org_idx
  on public.payment_batches (organization_id, status, payment_date);

create table if not exists public.payment_batch_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  batch_id uuid not null references public.payment_batches (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  employee_code text not null,
  employee_name text not null,
  bank_account_id uuid references public.employee_bank_accounts (id) on delete set null,
  account_number_last4 text,
  ifsc text,
  amount numeric(14, 2) not null default 0,
  status text not null default 'PENDING' check (status in (
    'PENDING', 'SUCCESS', 'FAILED', 'REVERSED', 'RECONCILED', 'EXCLUDED'
  )),
  exclusion_reason text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, employee_id),
  check (amount >= 0)
);

create index if not exists payment_batch_items_batch_idx
  on public.payment_batch_items (batch_id, status);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  batch_id uuid not null references public.payment_batches (id) on delete cascade,
  item_id uuid not null references public.payment_batch_items (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  amount numeric(14, 2) not null,
  payment_date date not null,
  reference text,
  bank_reference text,
  status text not null check (status in ('SUCCESS', 'FAILED', 'REVERSED', 'RECONCILED')),
  failure_reason text,
  notes text,
  source text not null check (source in ('MANUAL', 'IMPORT')),
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payment_transactions_batch_idx
  on public.payment_transactions (batch_id, created_at desc);
create index if not exists payment_transactions_item_idx
  on public.payment_transactions (item_id, created_at desc);

create table if not exists public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  batch_id uuid not null references public.payment_batches (id) on delete cascade,
  file_name text,
  status text not null default 'PREVIEW' check (status in ('PREVIEW', 'CONFIRMED', 'DISCARDED')),
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  duplicate_count integer not null default 0,
  mismatch_count integer not null default 0,
  summary_json text,
  created_by uuid references public.user_profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payment_reconciliations_batch_idx
  on public.payment_reconciliations (batch_id, created_at desc);

create table if not exists public.report_export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_key text not null,
  format text not null default 'CSV' check (format in ('CSV')),
  filters_json text,
  row_count integer not null default 0,
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'FAILED')),
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists report_export_jobs_org_idx
  on public.report_export_jobs (organization_id, created_at desc);

-- updated_at triggers
drop trigger if exists accounting_accounts_updated_at on public.accounting_accounts;
create trigger accounting_accounts_updated_at before update on public.accounting_accounts
  for each row execute function public.set_updated_at();
drop trigger if exists payroll_account_mappings_updated_at on public.payroll_account_mappings;
create trigger payroll_account_mappings_updated_at before update on public.payroll_account_mappings
  for each row execute function public.set_updated_at();
drop trigger if exists payroll_journals_updated_at on public.payroll_journals;
create trigger payroll_journals_updated_at before update on public.payroll_journals
  for each row execute function public.set_updated_at();
drop trigger if exists payment_settings_updated_at on public.payment_settings;
create trigger payment_settings_updated_at before update on public.payment_settings
  for each row execute function public.set_updated_at();
drop trigger if exists payment_batches_updated_at on public.payment_batches;
create trigger payment_batches_updated_at before update on public.payment_batches
  for each row execute function public.set_updated_at();
drop trigger if exists payment_batch_items_updated_at on public.payment_batch_items;
create trigger payment_batch_items_updated_at before update on public.payment_batch_items
  for each row execute function public.set_updated_at();

-- Permissions
insert into public.permissions (code, name, group_name) values
  ('reports.view', 'View reports', 'Reports'),
  ('reports.export', 'Export reports', 'Reports'),
  ('accounting.manage', 'Manage ledger accounts and mappings', 'Accounting'),
  ('accounting.journal.view', 'View payroll journals', 'Accounting'),
  ('accounting.journal.export', 'Export payroll journals', 'Accounting'),
  ('payments.view', 'View salary payment batches', 'Payments'),
  ('payments.create', 'Create and validate payment batches', 'Payments'),
  ('payments.approve', 'Approve payment batches', 'Payments'),
  ('payments.export', 'Export bank payment files', 'Payments'),
  ('payments.reconcile', 'Record and reconcile payments', 'Payments')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name in ('Reports', 'Accounting', 'Payments')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('reports.view', 'reports.export')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'reports.view', 'reports.export', 'accounting.journal.view',
  'payments.view', 'payments.create', 'payments.export'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'reports.view', 'reports.export', 'accounting.manage',
  'accounting.journal.view', 'accounting.journal.export',
  'payments.view', 'payments.create', 'payments.approve', 'payments.export', 'payments.reconcile'
)
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('reports.view')
where r.organization_id is null and r.code = 'MANAGER'
on conflict (role_id, permission_id) do nothing;

-- RLS
alter table public.accounting_accounts enable row level security;
alter table public.payroll_account_mappings enable row level security;
alter table public.payroll_journals enable row level security;
alter table public.payroll_journal_lines enable row level security;
alter table public.accounting_exports enable row level security;
alter table public.payment_settings enable row level security;
alter table public.payment_batches enable row level security;
alter table public.payment_batch_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_reconciliations enable row level security;
alter table public.report_export_jobs enable row level security;

drop policy if exists accounting_accounts_select on public.accounting_accounts;
create policy accounting_accounts_select on public.accounting_accounts
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'accounting.manage')
      or public.has_org_permission(organization_id, 'accounting.journal.view'))
  );
drop policy if exists accounting_accounts_write on public.accounting_accounts;
create policy accounting_accounts_write on public.accounting_accounts
  for all using (public.has_org_permission(organization_id, 'accounting.manage'))
  with check (public.has_org_permission(organization_id, 'accounting.manage'));

drop policy if exists payroll_account_mappings_select on public.payroll_account_mappings;
create policy payroll_account_mappings_select on public.payroll_account_mappings
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'accounting.manage')
      or public.has_org_permission(organization_id, 'accounting.journal.view'))
  );
drop policy if exists payroll_account_mappings_write on public.payroll_account_mappings;
create policy payroll_account_mappings_write on public.payroll_account_mappings
  for all using (public.has_org_permission(organization_id, 'accounting.manage'))
  with check (public.has_org_permission(organization_id, 'accounting.manage'));

drop policy if exists payroll_journals_select on public.payroll_journals;
create policy payroll_journals_select on public.payroll_journals
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'accounting.journal.view')
      or public.has_org_permission(organization_id, 'accounting.journal.export'))
  );
drop policy if exists payroll_journals_write on public.payroll_journals;
create policy payroll_journals_write on public.payroll_journals
  for all using (public.has_org_permission(organization_id, 'accounting.journal.export'))
  with check (public.has_org_permission(organization_id, 'accounting.journal.export'));

drop policy if exists payroll_journal_lines_select on public.payroll_journal_lines;
create policy payroll_journal_lines_select on public.payroll_journal_lines
  for select using (
    organization_id in (select public.current_org_ids())
    and (public.has_org_permission(organization_id, 'accounting.journal.view')
      or public.has_org_permission(organization_id, 'accounting.journal.export'))
  );
drop policy if exists payroll_journal_lines_write on public.payroll_journal_lines;
create policy payroll_journal_lines_write on public.payroll_journal_lines
  for all using (public.has_org_permission(organization_id, 'accounting.journal.export'))
  with check (public.has_org_permission(organization_id, 'accounting.journal.export'));

drop policy if exists accounting_exports_select on public.accounting_exports;
create policy accounting_exports_select on public.accounting_exports
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'accounting.journal.view')
  );
drop policy if exists accounting_exports_write on public.accounting_exports;
create policy accounting_exports_write on public.accounting_exports
  for all using (public.has_org_permission(organization_id, 'accounting.journal.export'))
  with check (public.has_org_permission(organization_id, 'accounting.journal.export'));

drop policy if exists payment_settings_select on public.payment_settings;
create policy payment_settings_select on public.payment_settings
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payments.view')
  );
drop policy if exists payment_settings_write on public.payment_settings;
create policy payment_settings_write on public.payment_settings
  for all using (public.has_org_permission(organization_id, 'payments.create'))
  with check (public.has_org_permission(organization_id, 'payments.create'));

drop policy if exists payment_batches_select on public.payment_batches;
create policy payment_batches_select on public.payment_batches
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payments.view')
  );
drop policy if exists payment_batches_write on public.payment_batches;
create policy payment_batches_write on public.payment_batches
  for all using (public.has_org_permission(organization_id, 'payments.create'))
  with check (public.has_org_permission(organization_id, 'payments.create'));

drop policy if exists payment_batch_items_select on public.payment_batch_items;
create policy payment_batch_items_select on public.payment_batch_items
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payments.view')
  );
drop policy if exists payment_batch_items_write on public.payment_batch_items;
create policy payment_batch_items_write on public.payment_batch_items
  for all using (public.has_org_permission(organization_id, 'payments.create'))
  with check (public.has_org_permission(organization_id, 'payments.create'));

drop policy if exists payment_transactions_select on public.payment_transactions;
create policy payment_transactions_select on public.payment_transactions
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payments.view')
  );
drop policy if exists payment_transactions_write on public.payment_transactions;
create policy payment_transactions_write on public.payment_transactions
  for all using (public.has_org_permission(organization_id, 'payments.reconcile'))
  with check (public.has_org_permission(organization_id, 'payments.reconcile'));

drop policy if exists payment_reconciliations_select on public.payment_reconciliations;
create policy payment_reconciliations_select on public.payment_reconciliations
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'payments.view')
  );
drop policy if exists payment_reconciliations_write on public.payment_reconciliations;
create policy payment_reconciliations_write on public.payment_reconciliations
  for all using (public.has_org_permission(organization_id, 'payments.reconcile'))
  with check (public.has_org_permission(organization_id, 'payments.reconcile'));

drop policy if exists report_export_jobs_select on public.report_export_jobs;
create policy report_export_jobs_select on public.report_export_jobs
  for select using (
    organization_id in (select public.current_org_ids())
    and public.has_org_permission(organization_id, 'reports.view')
  );
drop policy if exists report_export_jobs_write on public.report_export_jobs;
create policy report_export_jobs_write on public.report_export_jobs
  for all using (public.has_org_permission(organization_id, 'reports.export'))
  with check (public.has_org_permission(organization_id, 'reports.export'));

grant select, insert, update on public.accounting_accounts, public.payroll_account_mappings,
  public.payroll_journals, public.payroll_journal_lines, public.accounting_exports,
  public.payment_settings, public.payment_batches, public.payment_batch_items,
  public.payment_transactions, public.payment_reconciliations, public.report_export_jobs
  to authenticated;

insert into storage.buckets (id, name, public)
values ('payment-exports', 'payment-exports', false)
on conflict (id) do nothing;

drop policy if exists payment_exports_storage_select on storage.objects;
create policy payment_exports_storage_select on storage.objects
  for select using (
    bucket_id = 'payment-exports'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payments.export')
  );

drop policy if exists payment_exports_storage_insert on storage.objects;
create policy payment_exports_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'payment-exports'
    and ((storage.foldername(name))[1])::uuid in (select public.current_org_ids())
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'payments.export')
  );
