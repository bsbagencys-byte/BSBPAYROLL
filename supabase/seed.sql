-- DEVELOPMENT DEMO DATA — easy to remove.
-- Marked with is_demo = true. Do not run in production.
--
-- Removal:
--   delete from public.organization_users where organization_id in (select id from public.organizations where is_demo);
--   delete from public.user_profiles where is_demo;
--   delete from public.organizations where is_demo;
--
-- Auth users must still be created in Supabase Auth (see scripts/seed-demo.ts)
-- using the internal mapping emails below. Those emails are never shown in UI.

do $$
declare
  org_id uuid := '11111111-1111-1111-1111-111111111111';
  branch_id uuid := '22222222-2222-2222-2222-222222222222';
  dept_id uuid := '33333333-3333-3333-3333-333333333333';
  desig_id uuid := '44444444-4444-4444-4444-444444444444';
  super_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  hr_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  payroll_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  emp_id uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  role_super uuid;
  role_hr uuid;
  role_payroll uuid;
  role_emp uuid;
begin
  insert into public.organizations (
    id, name, legal_name, display_name, phone, email,
    address_line1, city, state, pin, pan, tan, gstin,
    industry, payroll_frequency, weekly_off, timezone, currency,
    setup_completed, setup_step, status, is_demo
  ) values (
    org_id,
    'BSB Demo Pvt Ltd',
    'BSB Demo Private Limited',
    'BSB Demo',
    '9876543210',
    'ops@demo.bsbpayroll.example',
    '12 MG Road',
    'Bengaluru',
    'Karnataka',
    '560001',
    'ABCDE1234F',
    'BLRA12345B',
    '29ABCDE1234F1Z5',
    'Information Technology',
    'MONTHLY',
    'SUNDAY',
    'Asia/Kolkata',
    'INR',
    true,
    4,
    'ACTIVE',
    true
  ) on conflict (id) do nothing;

  insert into public.branches (id, organization_id, name, code, is_default, status)
  values (branch_id, org_id, 'Head Office', 'HO', true, 'ACTIVE')
  on conflict (id) do nothing;

  insert into public.departments (id, organization_id, name, code, is_default, status)
  values (dept_id, org_id, 'Operations', 'OPS', true, 'ACTIVE')
  on conflict (id) do nothing;

  insert into public.designations (id, organization_id, name, code, is_default, status)
  values (desig_id, org_id, 'Staff', 'STF', true, 'ACTIVE')
  on conflict (id) do nothing;

  insert into public.user_profiles (id, username, display_name, mobile, status, is_demo) values
    (super_id, 'bsbadmin', 'BSB Super Admin', '9000000001', 'ACTIVE', true),
    (hr_id, 'bsbhr', 'BSB HR', '9000000002', 'ACTIVE', true),
    (payroll_id, 'bsbpayroll', 'BSB Payroll', '9000000003', 'ACTIVE', true),
    (emp_id, 'bsbemployee', 'BSB Employee', '9000000004', 'ACTIVE', true)
  on conflict (id) do nothing;

  select id into role_super from public.roles where organization_id is null and code = 'SUPER_ADMIN';
  select id into role_hr from public.roles where organization_id is null and code = 'HR';
  select id into role_payroll from public.roles where organization_id is null and code = 'PAYROLL';
  select id into role_emp from public.roles where organization_id is null and code = 'EMPLOYEE';

  insert into public.organization_users (organization_id, user_id, role_id, branch_id, status) values
    (org_id, super_id, role_super, branch_id, 'ACTIVE'),
    (org_id, hr_id, role_hr, branch_id, 'ACTIVE'),
    (org_id, payroll_id, role_payroll, branch_id, 'ACTIVE'),
    (org_id, emp_id, role_emp, branch_id, 'ACTIVE')
  on conflict (organization_id, user_id) do nothing;

  insert into public.username_lookup (username, auth_email, user_id) values
    ('bsbadmin', 'bsbadmin@auth.bsbpayroll.internal', super_id),
    ('bsbhr', 'bsbhr@auth.bsbpayroll.internal', hr_id),
    ('bsbpayroll', 'bsbpayroll@auth.bsbpayroll.internal', payroll_id),
    ('bsbemployee', 'bsbemployee@auth.bsbpayroll.internal', emp_id)
  on conflict (username) do nothing;
end $$;
