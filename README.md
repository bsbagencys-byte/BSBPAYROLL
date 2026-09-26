# BSB Payroll

Phase 1 foundation plus Phase 2 employee and organisation management. TypeScript, Next.js App Router, Tailwind, Supabase Auth + PostgreSQL + RLS.

This app does **not** implement payroll, attendance, leave or biometric logic.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase: Auth, PostgreSQL, RLS
- Username + password login via a private auth-email mapping layer

## Local preview

```bash
cp .env.example .env.local
```

Keep `NEXT_PUBLIC_DEMO_MODE=true` to run without a live Supabase project.

```bash
npm install
npm run dev
```

Demo logins (development only):

- `bsbadmin` / `Admin@123`
- `bsbhr` / `Hruser@123`
- `bsbpayroll` / `Payroll@123`
- `bsbemployee` / `Employee@123`

## Production (Supabase)

1. Create a Supabase project.
2. Put the URL and anon key in `.env.local`. Keep the **service role key server-only**.
3. Run `supabase/schema.sql`, then `supabase/seed.sql` only in non-production.
4. Set `NEXT_PUBLIC_DEMO_MODE=false`.
5. Create Auth users that match `username@AUTH_EMAIL_DOMAIN`. Those emails are never shown in the UI.

## Routes

- `/login` username + password
- `/forgot-password` and `/reset-password`
- `/setup` company wizard (required before app access)
- `/dashboard`
- `/profile`
- `/settings/company`
- `/settings/branches`
- `/settings/departments`
- `/settings/designations`
- `/settings/locations`
- `/settings/employment-types`
- `/settings/users`
- `/settings/roles`
- `/settings/security`
- `/employees`
- `/employees/new`
- `/employees/[id]`
- `/employees/import`
- `/employees/hierarchy`

Attendance, leave, biometric, payroll, reports and compliance remain Coming Soon.

## Security

- RLS isolates every business table by `organization_id`
- Passwords are never stored in plaintext
- Login is rate-limited
- Audit events: login, logout, failed login, user create/edit/disable, role change, company settings
- Service role keys must not be prefixed with `NEXT_PUBLIC_`

## Later phases

eSSL biometric, attendance, leave, salary components, payroll, payslips, compliance, reports, employee self-service.
