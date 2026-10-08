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
