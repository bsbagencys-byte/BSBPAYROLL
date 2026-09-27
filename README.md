# BSB Payroll

Phase 1 foundation, Phase 2 employee and organisation management, and Phase 3 universal biometric ingest. TypeScript, Next.js App Router, Tailwind, Supabase Auth + PostgreSQL + RLS.

This app does **not** implement payroll, attendance calculation, leave, Face, QR, GPS or mobile attendance.

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
3. Run `supabase/combined.sql` in the SQL Editor (Phase 1 + Phase 2 + Phase 3). Then run `supabase/seed.sql` only in non-production. Existing projects can run `supabase/phase3.sql` after combined.sql.
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
- `/biometric`
- `/biometric/devices/new`
- `/biometric/devices/[id]`
- `/biometric/mapping`
- `/biometric/punches`
- `/biometric/live`
- `/biometric/logs`
- `/biometric/simulator`
- `POST /api/biometric/push`
- `POST /api/biometric/webhook`

Attendance calculation, leave, payroll, reports and compliance remain Coming Soon.

## Security

- RLS isolates every business table by `organization_id`
- Passwords are never stored in plaintext
- Login is rate-limited
- Audit events: login, logout, failed login, user create/edit/disable, role change, company settings, biometric device and mapping changes
- Public biometric ingest is token-authenticated and rate-limited; device tokens are stored as hashes only
- Service role keys must not be prefixed with `NEXT_PUBLIC_`

## Later phases

Attendance calculation, leave, salary components, payroll, payslips, compliance, reports, employee self-service. New biometric vendors add an adapter, not a rewrite.
