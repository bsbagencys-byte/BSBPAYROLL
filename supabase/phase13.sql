-- BSB Payroll Phase 13 — Employee Self-Service (ESS) portal
-- Safe to re-run. Additive overlay. Does not rebuild Phase 1–12 modules.
-- No attendance engine, no QR/GPS/face recognition. Identity is always server-resolved.

create or replace function public.current_employee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where user_id = public.current_profile_id();
$$;

create table if not exists public.ess_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  type text not null default 'INFO' check (type in ('INFO', 'ACTION', 'APPROVAL', 'ALERT')),
  title text not null,
  body text,
  href text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ess_notifications_user_idx
  on public.ess_notifications (user_id, read_at, created_at desc);

create index if not exists ess_notifications_org_idx
  on public.ess_notifications (organization_id, created_at desc);

create table if not exists public.ess_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  requested_by uuid not null references public.user_profiles (id) on delete cascade,
  category text not null check (category in (
    'CONTACT', 'ADDRESS', 'EMERGENCY', 'BANK', 'STATUTORY', 'EDUCATION', 'OTHER'
  )),
  field_key text not null,
  current_value text,
  requested_value text not null,
  reason text,
  status text not null default 'PENDING' check (status in (
    'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  )),
  reviewer_id uuid references public.user_profiles (id) on delete set null,
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ess_change_requests_org_idx
  on public.ess_change_requests (organization_id, status, created_at desc);

create index if not exists ess_change_requests_employee_idx
  on public.ess_change_requests (employee_id, status);

drop trigger if exists ess_change_requests_updated_at on public.ess_change_requests;
create trigger ess_change_requests_updated_at
  before update on public.ess_change_requests
  for each row execute function public.set_updated_at();

insert into public.permissions (code, name, group_name) values
  ('self.view', 'Access self-service portal', 'Self Service'),
  ('self.profile.update', 'Request profile changes', 'Self Service'),
  ('self.change_request.review', 'Review profile change requests', 'Self Service'),
  ('self.notifications.manage', 'Send self-service notifications', 'Self Service')
on conflict (code) do nothing;

-- SUPER_ADMIN and ADMIN already receive every permission via seed, but keep this
-- idempotent grant so the ESS group is present for environments seeded before it.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Self Service'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'self.view', 'self.profile.update', 'self.change_request.review', 'self.notifications.manage'
)
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'self.view', 'self.profile.update', 'self.notifications.manage'
)
where r.organization_id is null and r.code = 'PAYROLL'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('self.view', 'self.profile.update')
where r.organization_id is null and r.code in ('ACCOUNTANT', 'MANAGER', 'EMPLOYEE')
on conflict (role_id, permission_id) do nothing;

alter table public.ess_notifications enable row level security;
alter table public.ess_change_requests enable row level security;

drop policy if exists ess_notifications_select on public.ess_notifications;
create policy ess_notifications_select on public.ess_notifications
  for select using (user_id = public.current_profile_id());

drop policy if exists ess_notifications_update on public.ess_notifications;
create policy ess_notifications_update on public.ess_notifications
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists ess_notifications_insert on public.ess_notifications;
create policy ess_notifications_insert on public.ess_notifications
  for insert with check (
    public.has_org_permission(organization_id, 'self.notifications.manage')
    or user_id = public.current_profile_id()
  );

drop policy if exists ess_change_requests_select on public.ess_change_requests;
create policy ess_change_requests_select on public.ess_change_requests
  for select using (
    organization_id in (select public.current_org_ids())
    and (
      employee_id in (select public.current_employee_ids())
      or public.has_org_permission(organization_id, 'self.change_request.review')
    )
  );

drop policy if exists ess_change_requests_insert on public.ess_change_requests;
create policy ess_change_requests_insert on public.ess_change_requests
  for insert with check (
    organization_id in (select public.current_org_ids())
    and employee_id in (select public.current_employee_ids())
    and requested_by = public.current_profile_id()
  );

drop policy if exists ess_change_requests_update on public.ess_change_requests;
create policy ess_change_requests_update on public.ess_change_requests
  for update using (
    organization_id in (select public.current_org_ids())
    and (
      employee_id in (select public.current_employee_ids())
      or public.has_org_permission(organization_id, 'self.change_request.review')
    )
  )
  with check (
    organization_id in (select public.current_org_ids())
    and (
      employee_id in (select public.current_employee_ids())
      or public.has_org_permission(organization_id, 'self.change_request.review')
    )
  );

grant select, insert, update on public.ess_notifications, public.ess_change_requests
  to authenticated;
