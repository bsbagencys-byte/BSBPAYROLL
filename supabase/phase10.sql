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
