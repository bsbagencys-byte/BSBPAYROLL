# BSB Payroll

Phase 1 foundation, Phase 2 employee and organisation management, Phase 3 universal biometric ingest, Phase 5 leave and holiday management, Phase 6 salary and compensation, Phase 7 benefits, reimbursements, TA/DA and claims, Phase 8 loans and advances, Phase 9 payroll and compliance, Phase 10 review, approval, finalization and payslip foundation, Phase 11 versioned India statutory and tax engine, Phase 12 employee exit, full & final settlement and contractor payroll, Phase 13 employee self-service, Phase 14 reports, accounting exports and salary payments, Phase 15 automation, notifications, scheduled jobs, signed webhooks and scoped APIs, Phase 16 explainable analytics, anomaly detection, optional AI assistant and biometric vendor expansion, and Phase 17 production-readiness overlay. TypeScript, Next.js App Router, Tailwind, Supabase Auth + PostgreSQL + RLS.

This app does **not** implement full attendance calculation, Face, QR, GPS or mobile attendance. Approved leave writes a thin `attendance_days` mark; punches stay in Phase 3 ingest. Payroll treats unmarked working days as paid until Phase 4.

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
3. Run `supabase/combined.sql` in the SQL Editor (Phase 1 + Phase 2 + Phase 3 + Phase 5 + Phase 6 + Phase 7 + Phase 8 + Phase 9 + Phase 10 + Phase 11 + Phase 12 + Phase 13 + Phase 14 + Phase 15 + Phase 16 + Phase 17). Then run `supabase/seed.sql` only in non-production. Existing projects can run `supabase/phase3.sql` through `supabase/phase17.sql` after combined.sql.
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
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
JOBS_WORKER_SECRET=
USER_LLM_API_KEY=
USER_LLM_BASE_URL=
USER_LLM_MODEL=
```

`NEXT_PUBLIC_APP_URL` must be the live Vercel URL (for example `https://your-app.vercel.app`). After the first deploy, add that domain in Supabase Auth redirect URLs.

Demo mode is for local preview only. Production must use real Supabase credentials and `NEXT_PUBLIC_DEMO_MODE=false`.

## Routes

- `/login` username + password
- `/forgot-password` and `/reset-password`
- `/setup` company wizard (required before app access)
- `/dashboard`
- `/profile`
- `/my` employee self-service (dashboard, profile, attendance, leave, payslips, salary, claims, loans, documents, tax documents, requests, notifications)
- `/my/team` manager view of direct reports
- `/settings/company`
- `/settings/branches`
- `/settings/departments`
- `/settings/designations`
- `/settings/locations`
- `/settings/employment-types`
- `/settings/users`
- `/settings/roles`
- `/settings/security`
- `/settings/notifications`
- `/settings/developers`
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
- `/benefits`
- `/benefits/types`
- `/benefits/policies`
- `/benefits/employee`
- `/benefits/reports`
- `GET /api/benefits/reports/types`
- `GET /api/benefits/reports/assignments`
- `/claims`
- `/claims/new`
- `/claims/pending`
- `/claims/approvals`
- `/claims/approved`
- `/claims/history`
- `/claims/policies`
- `/claims/reports`
- `/claims/[id]`
- `GET /api/claims/reports/claims`
- `GET /api/claims/reports/pending`
- `GET /api/claims/reports/approved`
- `GET /api/claims/reports/policies`
- `/loans`
- `/loans/types`
- `/loans/applications`
- `/loans/applications/new`
- `/loans/applications/[id]`
- `/loans/active`
- `/loans/accounts/[id]`
- `/loans/repayments`
- `/loans/history`
- `/loans/settings`
- `GET /api/loans/reports/register`
- `GET /api/loans/reports/active`
- `GET /api/loans/reports/outstanding`
- `GET /api/loans/reports/schedule`
- `GET /api/loans/reports/repayments`
- `GET /api/loans/reports/advances`
- `GET /api/loans/reports/overdue`
- `GET /api/loans/reports/statement`
- `/payroll`
- `/payroll/runs`
- `/payroll/runs/[id]`
- `/payroll/review`
- `/payroll/exceptions`
- `/payroll/employees`
- `/payroll/payslips`
- `/payroll/payslips/[id]`
- `/payroll/reports`
- `/payroll/settings`
- `GET /api/payroll/reports/register`
- `GET /api/payroll/reports/sheet`
- `GET /api/payroll/reports/employee`
- `GET /api/payroll/reports/earnings`
- `GET /api/payroll/reports/deductions`
- `GET /api/payroll/reports/approval`
- `GET /api/payroll/reports/bank`
- `GET /api/payroll/reports/payslips`
- `GET /api/payroll/payslips/[id]/pdf`
- `/compliance`
- `/compliance/rules`
- `/compliance/pf`
- `/compliance/esi`
- `/compliance/pt`
- `/compliance/lwf`
- `/compliance/tds`
- `/compliance/declarations`
- `/compliance/proofs`
- `/compliance/forms`
- `/compliance/reports`
- `/compliance/settings`
- `GET /api/compliance/reports/pf`
- `GET /api/compliance/reports/esi`
- `GET /api/compliance/reports/pt`
- `GET /api/compliance/reports/lwf`
- `GET /api/compliance/reports/tds`
- `/employees/exits`
- `/employees/exits/new`
- `/employees/exits/[id]`
- `/employees/exits/clearance`
- `/employees/exits/reports`
- `GET /api/exits/reports/register`
- `GET /api/exits/reports/notice`
- `GET /api/exits/reports/clearance`
- `/settlements`
- `/settlements/new`
- `/settlements/[id]`
- `/settlements/reports`
- `GET /api/settlements/reports/register`
- `GET /api/settlements/reports/pending`
- `GET /api/settlements/reports/paid`
- `GET /api/settlements/[id]/pdf`
- `/contractors`
- `/contractors/new`
- `/contractors/[id]`
- `/contractors/engagements`
- `/contractors/reports`
- `/contractor-payments`
- `/contractor-payments/new`
- `/contractor-payments/[id]`
- `/contractor-payments/approvals`
- `GET /api/contractors/reports/register`
- `GET /api/contractors/reports/engagements`
- `GET /api/contractors/reports/invoices`
- `GET /api/contractors/reports/withholding`
- `/reports`
- `/reports/[key]`
- `GET /api/reports/[key]`
- `/accounting`
- `/accounting/mappings`
- `/accounting/journals`
- `/accounting/[id]`
- `/accounting/exports`
- `GET /api/accounting/journals/[id]/csv`
- `/payments`
- `/payments/new`
- `/payments/[id]`
- `/payments/history`
- `/payments/settings`
- `GET /api/payments/[id]/csv`
- `/notifications`
- `/automation`
- `/automation/rules`
- `/automation/jobs`
- `GET /api/v1/employees`
- `GET /api/v1/organization`
- `GET /api/v1/attendance/summaries`
- `GET /api/v1/leave`
- `GET /api/v1/payroll/runs`
- `GET /api/v1/payslips`
- `POST /api/internal/jobs`
- `GET /api/internal/jobs`

Attendance calculation (Phase 4) remains Coming Soon.

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
- Variable earnings and reimbursements are stored and included when a payroll run is calculated.
- Attendance and leave are read-only inputs (working days, present, LOP). Salary never writes those tables.

## Benefits and claims

- Benefit types and policies are configurable (fuel, telephone, internet, medical are demo seeds, not hard-coded).
- Employee assignments block overlapping ACTIVE periods. Closing a previous assignment happens the day before a later start.
- Claim types, travel policies, draft/submit/approve (single-step or manager then finance).
- Policy engine checks eligibility, limits, duplicates, receipts and travel fields. FAIL blocks submit; the draft and checks are saved.
- TA/DA is distance x rate plus days x DA.
- `getApprovedPayrollClaimLines(organizationId, period)` is consumed by payroll. Process marks claims included; mark-paid sets paid.
- Receipts upload to private `claim-receipts` in live mode. Demo stores metadata only.

## Loans

- Loan types and policies are configurable (salary advance, employee loan, emergency and festival are demo seeds, not hard-coded).
- Interest methods: NONE, FLAT, REDUCING. EMI is quoted in `lib/loans/engine.ts`, never in the UI.
- Workflow: draft, submit, optional manager-then-finance approval, disburse. Disbursement creates the account, schedule and ledger.
- Salary advance uses a full recovery schedule, not a single balance field.
- Ledger is append-only (disbursement, principal/interest/manual repayment, payroll deduction reference, adjustment, waiver, reversal).
- `getEmployeeLoanDeductions(organizationId, employeeId, payrollPeriod)` is consumed by payroll. Process posts EMI as a payroll repayment.

## Security

- RLS isolates every business table by `organization_id`
- Passwords are never stored in plaintext
- Login is rate-limited
- Audit events: login, logout, failed login, user create/edit/disable, role change, company settings, biometric device and mapping changes, leave type/policy/request/holiday/balance changes, salary component/structure/assignment/revision changes, benefit type/policy/assignment changes, claim type/policy/submit/approve/reject changes, loan type/policy/application/disburse/repayment/adjustment changes, payroll run create/calculate/lock/process/paid, statutory rule changes, employee exit/clearance/settlement changes, contractor invoice and payment changes, webhook and API key create/rotate/revoke
- Public biometric ingest is token-authenticated and rate-limited; device tokens are stored as hashes only
- Service role keys must not be prefixed with `NEXT_PUBLIC_`

## Payroll

- One run per calendar month. Workflow: draft, calculate, lock, process, mark paid.
- Net pay uses salary snapshot, approved variable/reimbursement, approved claims and loan EMI, minus PF/ESI/PT/TDS.
- Unmarked working days count as paid until Phase 4 attendance calculation exists.
- Payslips issue on process. Compliance filings (PF, ESI, PT, TDS) are generated from included employees.
- Exited employees whose last working date is before the period are excluded from ordinary payroll.

## Exits and settlements

- Exit types: resignation, termination, retirement, contract expiry, other. Workflow includes notice, clearance and settlement.
- Required clearance must complete before F&F. Optional tasks do not block.
- Settlement uses salary on last working date, unpaid salary through LWD, leave encashment for encashable types, notice recovery or notice pay, outstanding loans, and versioned statutory deductions.
- Settlement PDF is available after finalization. Finalized settlements are not silently edited.

## Contractors

- Contractors are not employees and are not included in ordinary payroll runs.
- Engagements, invoices, verified TDS withholding, payment and cancel.
- Duplicate invoice numbers require an authorized override reason.

## Employee self-service

- `/my` is an additive overlay. Identity is always resolved server-side from the signed-in user; a browser-supplied employee id is never trusted for authorisation.
- Users with no linked employee record see a setup state instead of employee data.
- Own attendance, leave, payslips, salary, claims, loans, documents and tax declarations reuse existing services. No second attendance or approval engine.
- Profile changes go through requests. Bank and statutory changes are sensitive and are never auto-applied by approval; HR applies them in the employee master.
- Sensitive values are masked (bank account, PAN, Aadhaar last 4, UAN, ESIC). Documents use short-lived signed URLs; there are no public document URLs.
- In-app notifications are always available. Email is sent only when SMTP is configured and delivery succeeds; otherwise the delivery is recorded as unconfigured or failed. WhatsApp and SMS are not implemented.
- Managers only see direct reports (`reporting_manager_id`) and act through the existing leave/claims/loans screens.
- Not implemented: QR, GPS, face recognition, smart auto attendance, raw punch editing.

## Automation, APIs and webhooks

- Domain events write a durable outbox. Notifications, rules and webhooks consume the outbox. No in-request timers.
- Automation rules use predefined triggers, conditions and actions. There is no arbitrary SQL or user code. Sensitive payroll create/finalize never runs automatically without an authorized policy.
- Scheduled jobs are claimed with locking and idempotency. `POST /api/internal/jobs` requires `JOBS_WORKER_SECRET`.
- Webhooks are HMAC-signed with timestamp and event id. Secrets rotate. Localhost, private and metadata URLs are blocked.
- API keys are org-scoped, hashed, scoped (`employees|organization|attendance|leave|payroll|payslips.read`), expirable and revocable. The plaintext secret is shown only at create. Keys cannot bypass RLS, approvals or finalized payroll.
- Email env: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` or `MAIL_FROM`, `SMTP_PORT`. Missing provider is never reported as success.

## Analytics and optional AI

- `/analytics` reads stored payroll, leave, claims, loans and biometric data. Draft or in-progress payroll runs are labelled. Historical cost uses finalized, locked, processed or paid run totals only.
- Anomaly alerts are deterministic. They never mutate attendance, salaries, deductions, payroll or payments.
- The assistant is optional. Set `USER_LLM_API_KEY`, `USER_LLM_BASE_URL` and `USER_LLM_MODEL` to enable a model. Unconfigured mode still answers from stored analytics tools. The assistant cannot approve, calculate, finalize or edit payroll.
- ZKTeco and Matrix adapters parse documented PUSH/JSON payloads through the existing gateway. Physical hardware is not certified.

## Tests and health

```bash
npm test
```

- `GET /api/health` and `GET /api/health/live` do not require a session.
- Go-live: `docs/PRODUCTION_GO_LIVE_CHECKLIST.md`. Verdict is READY WITH DOCUMENTED LIMITATIONS.

## Later phases

Attendance calculation (Phase 4). New biometric vendors add an adapter, not a rewrite. Physical ZKTeco/Matrix hardware is not certified.
