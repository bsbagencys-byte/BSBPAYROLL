# BSB Payroll

Phase 1 foundation, Phase 2 employee and organisation management, Phase 3 universal biometric ingest, Phase 5 leave and holiday management, and Phase 6 salary and compensation. TypeScript, Next.js App Router, Tailwind, Supabase Auth + PostgreSQL + RLS.

This app does **not** implement payroll runs, statutory PF/ESI/TDS/PT, payslips, full attendance calculation, Face, QR, GPS or mobile attendance. Approved leave writes a thin `attendance_days` mark; punches stay in Phase 3 ingest.

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
3. Run `supabase/combined.sql` in the SQL Editor (Phase 1 + Phase 2 + Phase 3 + Phase 5 + Phase 6). Then run `supabase/seed.sql` only in non-production. Existing projects can run `supabase/phase3.sql`, `supabase/phase5.sql` and `supabase/phase6.sql` after combined.sql.
4. Set `NEXT_PUBLIC_DEMO_MODE=false`.
5. Create Auth users that match `username@AUTH_EMAIL_DOMAIN`. Those emails are never shown in the UI.

## Vercel

Import `https://github.com/bsbagencys-byte/BSBPAYROLL` as a Next.js project. Framework preset: Next.js. Build command: `npm run build`. Output: default.

Set these environment variables in the Vercel project (Production). Never prefix the service role key with `NEXT_PUBLIC_`.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
NEXT_PUBLIC_APP_URL
SESSION_SECRET
NEXT_PUBLIC_DEMO_MODE=false
AUTH_EMAIL_DOMAIN=auth.bsbpayroll.internal
```

`NEXT_PUBLIC_APP_URL` must be the live Vercel URL (for example `https://your-app.vercel.app`). After the first deploy, add that domain in Supabase Auth redirect URLs.

Demo mode is for local preview only. Production must use real Supabase credentials and `NEXT_PUBLIC_DEMO_MODE=false`.

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
- `/leave`
- `/leave/requests`
- `/leave/approvals`
- `/leave/balances`
- `/leave/calendar`
- `/leave/holidays`
- `/leave/types`
- `/leave/policies`
- `/leave/comp-off`
- `/leave/reports`
- `/leave/settings`
- `GET /api/leave/reports/requests`
- `GET /api/leave/reports/balances`
- `GET /api/leave/reports/holidays`
- `GET /api/leave/reports/attendance`
- `/salary`
- `/salary/components`
- `/salary/structures`
- `/salary/employee`
- `/salary/revisions`
- `/salary/history`
- `/salary/variable`
- `/salary/reimbursements`
- `/salary/reports`
- `/salary/settings`
- `GET /api/salary/reports/structures`
- `GET /api/salary/reports/compensation`
- `GET /api/salary/reports/revisions`
- `GET /api/salary/reports/ctc`
- `GET /api/salary/reports/without`
- `GET /api/salary/reports/variable`

Attendance calculation (Phase 4), payroll processing, compliance and full reports remain Coming Soon.

## Leave

- Leave types and policies are configurable (CL, SL, EL, LOP, COMP are demo seeds, not hard-coded).
- Day calculation skips weekly off (org `weekly_off`) and holidays unless the policy counts them.
- Half-day is first or second half; overlapping PENDING/APPROVED requests are blocked.
- Balances change through a ledger (`ALLOCATED`, `ACCRUED`, `USED`, `PENDING`, `CANCELLED`, `ADJUSTMENT`, `COMP_OFF_*`).
- Approved leave writes `attendance_days` as `PAID_LEAVE`, `UNPAID_LEAVE`, `HALF_DAY_LEAVE` or `COMP_OFF`. Cancel restores the previous status. Punch history is not erased.
- Holidays never become ABSENT.

## Salary

- Salary components and structures are configurable (Basic, HRA, DA, TA, Special, Incentive, OT, Loan EMI, Travel are demo seeds, not hard-coded).
- Calculation methods: FIXED, PERCENTAGE, FORMULA, MANUAL, RESIDUAL. Formulas use a controlled parser (`BASIC * 0.40`), never `eval`.
- `getEmployeeSalaryForDate(employeeId, date)` returns the assignment covering that date. Overlapping ACTIVE periods are blocked.
- Revisions close the previous period the day before the new effective date and write `salary_history`. Previous CTC is never overwritten.
- Variable earnings and reimbursements are stored for later payroll. PF/ESI/TDS and the monthly payroll run are not calculated here.
- Attendance and leave are read-only inputs (working days, present, LOP). Salary never writes those tables.

## Security

- RLS isolates every business table by `organization_id`
- Passwords are never stored in plaintext
- Login is rate-limited
- Audit events: login, logout, failed login, user create/edit/disable, role change, company settings, biometric device and mapping changes, leave type/policy/request/holiday/balance changes, salary component/structure/assignment/revision changes
- Public biometric ingest is token-authenticated and rate-limited; device tokens are stored as hashes only
- Service role keys must not be prefixed with `NEXT_PUBLIC_`

## Later phases

Attendance calculation, payroll processing, payslips, compliance, reports, employee self-service. New biometric vendors add an adapter, not a rewrite.
