-- BSB Payroll Phase 18 overlay (SaaS subscription and billing). Additive only.
-- Safe to re-run. Does not drop tenant data. Does not store card details.
-- Subscription billing is separate from employee salary payment batches.

insert into public.permissions (code, name, group_name) values
  ('subscriptions.view', 'View organization subscription', 'Billing'),
  ('subscriptions.manage', 'Manage organization subscriptions', 'Billing'),
  ('plans.manage', 'Manage subscription plans', 'Billing'),
  ('billing.view', 'View subscription invoices and usage', 'Billing'),
  ('billing.invoice.manage', 'Issue and void subscription invoices', 'Billing'),
  ('billing.payment.view', 'View subscription payment transactions', 'Billing'),
  ('billing.refund.manage', 'Record verified subscription refunds', 'Billing'),
  ('subscription.override', 'Override entitlements and subscription status', 'Billing')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.organization_id is null
  and r.code in ('SUPER_ADMIN', 'ADMIN')
  and p.group_name = 'Billing'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('subscriptions.view', 'billing.view', 'billing.payment.view')
where r.organization_id is null and r.code = 'HR'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('subscriptions.view', 'billing.view', 'billing.payment.view')
where r.organization_id is null and r.code = 'ACCOUNTANT'
on conflict (role_id, permission_id) do nothing;

create or replace function public.has_platform_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_users ou
    join public.user_profiles up on up.id = ou.user_id
    join public.roles r on r.id = ou.role_id
    where up.auth_user_id = auth.uid()
      and ou.status = 'ACTIVE'
      and r.organization_id is null
      and r.code = role_code
  );
$$;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  billing_cycle_default text not null default 'MONTHLY'
    check (billing_cycle_default in ('MONTHLY', 'ANNUAL')),
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12,2) not null default 0 check (annual_price >= 0),
  currency text not null default 'INR',
  trial_days integer not null default 0 check (trial_days >= 0),
  employee_limit integer check (employee_limit is null or employee_limit >= 0),
  branch_limit integer check (branch_limit is null or branch_limit >= 0),
  biometric_device_limit integer check (biometric_device_limit is null or biometric_device_limit >= 0),
  modules_json text not null default '[]',
  entitlements_json text not null default '{}',
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'RETIRED')),
  effective_from date,
  effective_to date,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_plans_status_idx on public.subscription_plans (status, code);

create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans (id) on delete cascade,
  entitlement_key text not null,
  limit_value numeric,
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, entitlement_key)
);

create index if not exists plan_entitlements_plan_idx on public.plan_entitlements (plan_id);

create table if not exists public.plan_price_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans (id) on delete cascade,
  monthly_price numeric(12,2) not null,
  annual_price numeric(12,2) not null,
  currency text not null default 'INR',
  employee_limit integer,
  branch_limit integer,
  biometric_device_limit integer,
  entitlements_json text not null default '{}',
  changed_by uuid references public.user_profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists plan_price_history_plan_idx on public.plan_price_history (plan_id, created_at desc);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  plan_code text not null,
  plan_name text not null,
  billing_cycle text not null check (billing_cycle in ('MONTHLY', 'ANNUAL')),
  status text not null
    check (status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
  unit_price numeric(12,2) not null default 0,
  currency text not null default 'INR',
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start date not null,
  current_period_end date not null,
  renews_at date,
  cancelled_at timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_ends_at date,
  plan_snapshot_json text not null default '{}',
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_subscriptions_open_idx
  on public.organization_subscriptions (organization_id)
  where status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED');

create index if not exists organization_subscriptions_org_idx
  on public.organization_subscriptions (organization_id, created_at desc);
create index if not exists organization_subscriptions_status_idx
  on public.organization_subscriptions (status, current_period_end);
create index if not exists organization_subscriptions_plan_idx
  on public.organization_subscriptions (plan_id);

create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid not null references public.organization_subscriptions (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  from_plan_code text,
  to_plan_code text,
  actor_user_id uuid references public.user_profiles (id) on delete set null,
  reason text,
  metadata_json text not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists subscription_history_org_idx
  on public.subscription_history (organization_id, created_at desc);
create index if not exists subscription_history_sub_idx
  on public.subscription_history (subscription_id, created_at desc);

create table if not exists public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions (id) on delete set null,
  metric_key text not null,
  quantity numeric not null default 0,
  limit_value numeric,
  remaining numeric,
  measured_at timestamptz not null default now(),
  source text not null default 'LIVE',
  unique (organization_id, metric_key, measured_at)
);

create index if not exists subscription_usage_org_idx
  on public.subscription_usage (organization_id, measured_at desc);

create table if not exists public.billing_profiles (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  legal_name text,
  billing_email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pin text,
  country text not null default 'IN',
  gstin text,
  pan text,
  tax_id text,
  tax_label text,
  tax_rate numeric(8,4),
  currency text not null default 'INR',
  invoice_notes text,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_billing_settings (
  id boolean primary key default true check (id),
  legal_name text,
  billing_email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pin text,
  country text not null default 'IN',
  gstin text,
  pan text,
  tax_label text,
  tax_rate numeric(8,4),
  currency text not null default 'INR',
  invoice_prefix text not null default 'BSB',
  tax_configured boolean not null default false,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_billing_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.billing_invoice_sequences (
  scope text primary key,
  last_number integer not null default 0,
  prefix text not null default 'BSB',
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions (id) on delete set null,
  invoice_number text not null unique,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID')),
  billing_cycle text not null check (billing_cycle in ('MONTHLY', 'ANNUAL')),
  period_start date not null,
  period_end date not null,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  plan_code text not null,
  plan_name text not null,
  currency text not null default 'INR',
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_label text,
  tax_rate numeric(8,4),
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  outstanding numeric(12,2) not null default 0,
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  seller_snapshot_json text not null default '{}',
  customer_snapshot_json text not null default '{}',
  tax_configured boolean not null default false,
  notes text,
  created_by uuid references public.user_profiles (id) on delete set null,
  updated_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_invoices_org_idx
  on public.billing_invoices (organization_id, created_at desc);
create index if not exists billing_invoices_status_idx
  on public.billing_invoices (status, due_date);
create index if not exists billing_invoices_subscription_idx
  on public.billing_invoices (subscription_id);

create table if not exists public.billing_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  line_type text not null check (line_type in ('SUBSCRIPTION', 'DISCOUNT', 'TAX', 'ADJUSTMENT')),
  description text not null,
  quantity numeric(12,4) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists billing_invoice_lines_invoice_idx
  on public.billing_invoice_lines (invoice_id, sort_order);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid references public.billing_invoices (id) on delete set null,
  subscription_id uuid references public.organization_subscriptions (id) on delete set null,
  provider text not null default 'NONE',
  provider_order_id text,
  provider_payment_id text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'PENDING'
    check (status in ('PENDING', 'FAILED', 'SUCCESS', 'REFUNDED')),
  failure_reason text,
  verified boolean not null default false,
  verified_at timestamptz,
  refunded_at timestamptz,
  idempotency_key text,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_payments_provider_payment_idx
  on public.billing_payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create unique index if not exists billing_payments_idempotency_idx
  on public.billing_payments (organization_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists billing_payments_org_idx
  on public.billing_payments (organization_id, created_at desc);
create index if not exists billing_payments_status_idx
  on public.billing_payments (status, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  organization_id uuid references public.organizations (id) on delete set null,
  payment_id uuid references public.billing_payments (id) on delete set null,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  processed_at timestamptz,
  error_message text,
  payload_json text not null default '{}',
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists payment_webhook_events_processed_idx
  on public.payment_webhook_events (processed, created_at desc);

create table if not exists public.billing_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions (id) on delete set null,
  invoice_id uuid references public.billing_invoices (id) on delete set null,
  kind text not null check (kind in ('CREDIT', 'DEBIT', 'ENTITLEMENT_OVERRIDE')),
  amount numeric(12,2) not null default 0,
  reason text not null,
  created_by uuid references public.user_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists billing_adjustments_org_idx
  on public.billing_adjustments (organization_id, created_at desc);

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at before update on public.subscription_plans
  for each row execute function public.set_updated_at();
drop trigger if exists plan_entitlements_updated_at on public.plan_entitlements;
create trigger plan_entitlements_updated_at before update on public.plan_entitlements
  for each row execute function public.set_updated_at();
drop trigger if exists organization_subscriptions_updated_at on public.organization_subscriptions;
create trigger organization_subscriptions_updated_at before update on public.organization_subscriptions
  for each row execute function public.set_updated_at();
drop trigger if exists billing_profiles_updated_at on public.billing_profiles;
create trigger billing_profiles_updated_at before update on public.billing_profiles
  for each row execute function public.set_updated_at();
drop trigger if exists platform_billing_settings_updated_at on public.platform_billing_settings;
create trigger platform_billing_settings_updated_at before update on public.platform_billing_settings
  for each row execute function public.set_updated_at();
drop trigger if exists billing_invoices_updated_at on public.billing_invoices;
create trigger billing_invoices_updated_at before update on public.billing_invoices
  for each row execute function public.set_updated_at();
drop trigger if exists billing_payments_updated_at on public.billing_payments;
create trigger billing_payments_updated_at before update on public.billing_payments
  for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.plan_price_history enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.subscription_history enable row level security;
alter table public.subscription_usage enable row level security;
alter table public.billing_profiles enable row level security;
alter table public.platform_billing_settings enable row level security;
alter table public.billing_invoice_sequences enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoice_lines enable row level security;
alter table public.billing_payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.billing_adjustments enable row level security;

drop policy if exists subscription_plans_select on public.subscription_plans;
create policy subscription_plans_select on public.subscription_plans
  for select using (
    status = 'ACTIVE'
    or public.has_platform_role('SUPER_ADMIN')
  );
drop policy if exists subscription_plans_write on public.subscription_plans;
create policy subscription_plans_write on public.subscription_plans
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists plan_entitlements_select on public.plan_entitlements;
create policy plan_entitlements_select on public.plan_entitlements
  for select using (true);
drop policy if exists plan_entitlements_write on public.plan_entitlements;
create policy plan_entitlements_write on public.plan_entitlements
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists plan_price_history_select on public.plan_price_history;
create policy plan_price_history_select on public.plan_price_history
  for select using (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists organization_subscriptions_select on public.organization_subscriptions;
create policy organization_subscriptions_select on public.organization_subscriptions
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'subscriptions.view')
    )
  );
drop policy if exists organization_subscriptions_write on public.organization_subscriptions;
create policy organization_subscriptions_write on public.organization_subscriptions
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'subscriptions.manage')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'subscriptions.manage')
  );

drop policy if exists subscription_history_select on public.subscription_history;
create policy subscription_history_select on public.subscription_history
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'subscriptions.view')
    )
  );

drop policy if exists subscription_usage_select on public.subscription_usage;
create policy subscription_usage_select on public.subscription_usage
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'billing.view')
    )
  );

drop policy if exists billing_profiles_select on public.billing_profiles;
create policy billing_profiles_select on public.billing_profiles
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'billing.view')
    )
  );
drop policy if exists billing_profiles_write on public.billing_profiles;
create policy billing_profiles_write on public.billing_profiles
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'billing.invoice.manage')
    or public.has_org_permission(organization_id, 'organization.edit')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'billing.invoice.manage')
    or public.has_org_permission(organization_id, 'organization.edit')
  );

drop policy if exists platform_billing_settings_select on public.platform_billing_settings;
create policy platform_billing_settings_select on public.platform_billing_settings
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or exists (
      select 1 from public.organization_users ou
      join public.user_profiles up on up.id = ou.user_id
      where up.auth_user_id = auth.uid() and ou.status = 'ACTIVE'
    )
  );
drop policy if exists platform_billing_settings_write on public.platform_billing_settings;
create policy platform_billing_settings_write on public.platform_billing_settings
  for all using (public.has_platform_role('SUPER_ADMIN'))
  with check (public.has_platform_role('SUPER_ADMIN'));

drop policy if exists billing_invoices_select on public.billing_invoices;
create policy billing_invoices_select on public.billing_invoices
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'billing.view')
    )
  );
drop policy if exists billing_invoices_write on public.billing_invoices;
create policy billing_invoices_write on public.billing_invoices
  for all using (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'billing.invoice.manage')
  )
  with check (
    public.has_platform_role('SUPER_ADMIN')
    or public.has_org_permission(organization_id, 'billing.invoice.manage')
  );

drop policy if exists billing_invoice_lines_select on public.billing_invoice_lines;
create policy billing_invoice_lines_select on public.billing_invoice_lines
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'billing.view')
    )
  );

drop policy if exists billing_payments_select on public.billing_payments;
create policy billing_payments_select on public.billing_payments
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'billing.payment.view')
    )
  );

drop policy if exists billing_adjustments_select on public.billing_adjustments;
create policy billing_adjustments_select on public.billing_adjustments
  for select using (
    public.has_platform_role('SUPER_ADMIN')
    or (
      organization_id in (select public.current_org_ids())
      and public.has_org_permission(organization_id, 'billing.view')
    )
  );

drop policy if exists payment_webhook_events_select on public.payment_webhook_events;
create policy payment_webhook_events_select on public.payment_webhook_events
  for select using (public.has_platform_role('SUPER_ADMIN'));

grant select, insert, update on public.subscription_plans, public.plan_entitlements,
  public.plan_price_history, public.organization_subscriptions, public.subscription_history,
  public.subscription_usage, public.billing_profiles, public.platform_billing_settings,
  public.billing_invoice_sequences, public.billing_invoices, public.billing_invoice_lines,
  public.billing_payments, public.payment_webhook_events, public.billing_adjustments
  to authenticated;
