-- BSB Payroll Phase 19 overlay (customer onboarding, data migration, support, ops, export).
-- Additive only. Safe to re-run. Does not drop tenant data. Does not auto-delete on expire.

insert into public.permissions (code, name, group_name) values
  ('onboarding.view', 'View onboarding checklist', 'Onboarding'),
  ('onboarding.manage', 'Manage onboarding progress', 'Onboarding'),
  ('migration.view', 'View data migration jobs', 'Migration'),
  ('migration.manage', 'Preview and confirm data imports', 'Migration'),
  ('support.view', 'View support tickets', 'Support'),
  ('support.create', 'Create support tickets', 'Support'),
  ('support.manage', 'Update organization support tickets', 'Support'),
  ('support.platform', 'Manage platform support across organizations', 'Support'),
  ('data.export', 'Request organization data export', 'Data'),
  ('data.offboard', 'Request organization offboarding', 'Data'),
  ('platform.ops', 'View platform operations', 'Platform')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code = 'SUPER_ADMIN'
  and p.group_name in ('Onboarding', 'Migration', 'Support', 'Data', 'Platform')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'onboarding.view', 'onboarding.manage',
  'migration.view', 'migration.manage',
  'support.view', 'support.create', 'support.manage',
  'data.export'
)
where r.organization_id is null and r.code = 'ADMIN'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'onboarding.view', 'onboarding.manage',
  'migration.view', 'migration.manage',
  'support.view', 'support.create', 'support.manage',
  'data.export'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'onboarding.view', 'migration.view', 'migration.manage',
  'support.view', 'support.create'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'onboarding.view', 'support.view', 'support.create', 'data.export'
)
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('support.view', 'support.create')
where r.organization_id is null and r.code in ('MANAGER', 'EMPLOYEE')
on conflict (role_id, permission_id) do nothing;

create table if not exists public.onboarding_progress (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  current_step text not null default 'COMPANY',
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE')),
  completed_at timestamptz,
  skipped_attendance boolean not null default false,
  notes text,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  step_key text not null,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED', 'SKIPPED')),
  evidence_json text not null default '[]',
  last_checked_at timestamptz,
  completed_at timestamptz,
  skipped_reason text,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, step_key)
);

create index if not exists onboarding_steps_org_idx on public.onboarding_steps (organization_id, step_key);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null
    check (entity_type in ('EMPLOYEES', 'SALARY', 'LEAVE_BALANCES', 'LOAN_BALANCES', 'HISTORICAL_PAYROLL', 'OPENING_BALANCES')),
  file_name text not null,
  status text not null default 'UPLOADED'
    check (status in ('UPLOADED', 'PREVIEWED', 'CONFIRMED', 'IMPORTING', 'IMPORTED', 'PARTIAL', 'FAILED', 'CANCELLED')),
  total_rows integer not null default 0,
  ready_rows integer not null default 0,
  error_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  previewed_at timestamptz,
  confirmed_at timestamptz,
  imported_at timestamptz,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_org_idx on public.import_jobs (organization_id, created_at desc);

create table if not exists public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  row_number integer not null,
  payload_json text not null default '{}',
  status text not null default 'READY'
    check (status in ('READY', 'ERROR', 'WARNING', 'IMPORTED', 'SKIPPED')),
  errors_json text not null default '[]',
  warnings_json text not null default '[]',
  imported_entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists import_job_rows_job_idx on public.import_job_rows (job_id, row_number);

create table if not exists public.opening_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  kind text not null check (kind in ('LEAVE', 'LOAN', 'SALARY')),
  reference_code text,
  amount numeric(14,2) not null default 0,
  as_of_date date not null,
  notes text,
  import_job_id uuid references public.import_jobs (id) on delete set null,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists opening_balances_org_idx on public.opening_balances (organization_id, employee_id);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_number text not null,
  subject text not null,
  category text not null
    check (category in ('PAYROLL', 'ATTENDANCE', 'BILLING', 'MIGRATION', 'ACCESS', 'OTHER')),
  priority text not null default 'NORMAL'
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')),
  sla_due_at timestamptz,
  sla_breached boolean not null default false,
  created_by uuid references public.user_profiles (id) on delete set null,
  assigned_to uuid references public.user_profiles (id) on delete set null,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ticket_number)
);

create index if not exists support_tickets_org_idx on public.support_tickets (organization_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, sla_due_at);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_user_id uuid references public.user_profiles (id) on delete set null,
  visibility text not null default 'CUSTOMER'
    check (visibility in ('CUSTOMER', 'INTERNAL')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create table if not exists public.data_export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null
    check (kind in ('FULL', 'EMPLOYEES', 'PAYROLL', 'LEAVE', 'BILLING')),
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'PROCESSING', 'READY', 'EXPIRED', 'FAILED', 'CANCELLED')),
  file_name text,
  content text,
  requested_by uuid references public.user_profiles (id) on delete set null,
  ready_at timestamptz,
  expires_at timestamptz,
  downloaded_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_export_jobs_org_idx on public.data_export_jobs (organization_id, created_at desc);

create table if not exists public.offboarding_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'EXPORT_READY', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  reason text not null,
  export_job_id uuid references public.data_export_jobs (id) on delete set null,
  confirmed_at timestamptz,
  completed_at timestamptz,
  requested_by uuid references public.user_profiles (id) on delete set null,
  confirmed_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offboarding_requests_org_idx on public.offboarding_requests (organization_id, created_at desc);

drop trigger if exists onboarding_progress_updated_at on public.onboarding_progress;
create trigger onboarding_progress_updated_at before update on public.onboarding_progress
  for each row execute function public.set_updated_at();
drop trigger if exists onboarding_steps_updated_at on public.onboarding_steps;
create trigger onboarding_steps_updated_at before update on public.onboarding_steps
  for each row execute function public.set_updated_at();
drop trigger if exists import_jobs_updated_at on public.import_jobs;
create trigger import_jobs_updated_at before update on public.import_jobs
  for each row execute function public.set_updated_at();
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();
drop trigger if exists data_export_jobs_updated_at on public.data_export_jobs;
create trigger data_export_jobs_updated_at before update on public.data_export_jobs
  for each row execute function public.set_updated_at();
drop trigger if exists offboarding_requests_updated_at on public.offboarding_requests;
create trigger offboarding_requests_updated_at before update on public.offboarding_requests
  for each row execute function public.set_updated_at();

alter table public.onboarding_progress enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;
alter table public.opening_balances enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.data_export_jobs enable row level security;
alter table public.offboarding_requests enable row level security;

drop policy if exists onboarding_progress_select on public.onboarding_progress;
create policy onboarding_progress_select on public.onboarding_progress
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'onboarding.view')
    )
  );
drop policy if exists onboarding_progress_write on public.onboarding_progress;
create policy onboarding_progress_write on public.onboarding_progress
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'onboarding.manage')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'onboarding.manage')
  );

drop policy if exists onboarding_steps_select on public.onboarding_steps;
create policy onboarding_steps_select on public.onboarding_steps
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'onboarding.view')
    )
  );
drop policy if exists onboarding_steps_write on public.onboarding_steps;
create policy onboarding_steps_write on public.onboarding_steps
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'onboarding.manage')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'onboarding.manage')
  );

drop policy if exists import_jobs_select on public.import_jobs;
create policy import_jobs_select on public.import_jobs
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'migration.view')
    )
  );
drop policy if exists import_jobs_write on public.import_jobs;
create policy import_jobs_write on public.import_jobs
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'migration.manage')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'migration.manage')
  );

drop policy if exists import_job_rows_select on public.import_job_rows;
create policy import_job_rows_select on public.import_job_rows
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'migration.view')
    )
  );

drop policy if exists opening_balances_select on public.opening_balances;
create policy opening_balances_select on public.opening_balances
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'migration.view')
    )
  );

drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'support.view')
    )
  );
drop policy if exists support_tickets_write on public.support_tickets;
create policy support_tickets_write on public.support_tickets
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'support.create')
    or public.has_org_permission(organization_id, 'support.manage')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'support.create')
    or public.has_org_permission(organization_id, 'support.manage')
  );

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'support.view')
      and (
        visibility = 'CUSTOMER'
        or public.has_org_permission(organization_id, 'support.manage')
      )
    )
  );

drop policy if exists data_export_jobs_select on public.data_export_jobs;
create policy data_export_jobs_select on public.data_export_jobs
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'data.export')
    )
  );
drop policy if exists data_export_jobs_write on public.data_export_jobs;
create policy data_export_jobs_write on public.data_export_jobs
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'data.export')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'data.export')
  );

drop policy if exists offboarding_requests_select on public.offboarding_requests;
create policy offboarding_requests_select on public.offboarding_requests
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and (
        public.has_org_permission(organization_id, 'data.offboard')
        or public.has_org_permission(organization_id, 'data.export')
      )
    )
  );
drop policy if exists offboarding_requests_write on public.offboarding_requests;
create policy offboarding_requests_write on public.offboarding_requests
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'data.offboard')
    or public.has_org_permission(organization_id, 'organization.edit')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'data.offboard')
    or public.has_org_permission(organization_id, 'organization.edit')
  );

grant select, insert, update on public.onboarding_progress, public.onboarding_steps,
  public.import_jobs, public.import_job_rows, public.opening_balances,
  public.support_tickets, public.support_messages, public.data_export_jobs,
  public.offboarding_requests
  to authenticated;
