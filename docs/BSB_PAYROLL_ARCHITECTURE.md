# BSB Payroll Architecture

Stable technical architecture as implemented in the repository. Update only when code changes.

Legend: **IMPLEMENTED** | **PLANNED** | **FUTURE**

---

## Frontend — IMPLEMENTED

- Next.js 16 App Router + TypeScript + React 19.
- Tailwind CSS 4. UI primitives under `components/ui`.
- Auth routes in `app/(auth)`. Authenticated shell in `app/(app)` with `AppShell` + RBAC-aware nav.
- Next.js 16 `proxy.ts` (not `middleware.ts`) gates non-public routes.
- Server Components for pages; client forms use `useActionState` against server actions.
- Demo vs production is transparent to pages: repositories switch on `hasSupabaseConfig()` / `isDemoMode()`.
- `allowedDevOrigins`: `*.monkeycode-ai.live`.

Not a separate SPA. No client-side service-role keys.

---

## Backend — IMPLEMENTED

Single Next.js process.

- **Mutations:** `"use server"` actions in `actions/*.ts`.
- **Public HTTP:** biometric ingest only (`/api/biometric/push`, `/api/biometric/webhook`).
- **Authenticated HTTP:** CSV report downloads under `/api/leave/reports/*`, `/api/salary/reports/*`, `/api/benefits/reports/*`, `/api/claims/reports/*` and `/api/loans/reports/*`.
- **Data:** `createAdminClient()` (service role) or `getDemoStore()`.
- **Audit:** `writeAudit()` to `audit_logs` or in-memory ring.
- **Rate limit:** in-memory for login and biometric ingest.

No standalone API gateway or worker queue.

---

## Database — IMPLEMENTED

PostgreSQL via Supabase. Fresh install: `supabase/combined.sql`. Incremental phase files: `schema.sql`, `phase2.sql`, `phase3.sql`, `phase5.sql`, `phase6.sql`, `phase7.sql`, `phase8.sql`. Dev seed: `supabase/seed.sql`.

Every business table is org-scoped. RLS on. Triggers for `updated_at`.

See `BSB_PAYROLL_PROJECT_STATE.md` for the table list. There is no Phase 4 schema file.

Storage: private buckets `employee-documents` and `claim-receipts`.

---

## Authentication — IMPLEMENTED

Username + password, not email-as-identity in the UI.

1. Username maps to synthetic email `{username}@{AUTH_EMAIL_DOMAIN}` (`username_lookup`).
2. Demo: cookie `bsb_demo_session` = profile id; passwords in demo store.
3. Live: Supabase `signInWithPassword` after lookup. Failed/success rows in `login_attempts`.
4. Session: `getSessionUser()` loads profile, `organization_users`, role, permission codes.
5. Forgot/reset exist; demo reset returns a token in the action result.

Passwords are never stored in plaintext in app tables.

---

## Multi-tenancy — IMPLEMENTED

- `organizations` is the tenant.
- Users join via `organization_users` (role + optional branch).
- Setup wizard must complete before app access.
- Demo uses a single seeded org.

---

## RLS — IMPLEMENTED

- `ENABLE ROW LEVEL SECURITY` on public business tables.
- Select typically: org membership + permission code.
- Writes: `has_org_permission(organization_id, '...')`.
- `login_attempts` / `username_lookup`: deny-all to authenticated; service role only.
- Biometric raw insert policy denies client writes; gateway uses admin.

---

## RBAC — IMPLEMENTED (partial UI)

System roles: SUPER_ADMIN, ADMIN, HR, PAYROLL, ACCOUNTANT, MANAGER, EMPLOYEE.

Permission catalog in `lib/constants.ts` and SQL `permissions` / `role_permissions`.

Page and action checks: `hasPermission` / `requirePermissionOrRedirect`.

**PARTIAL:** `/settings/roles` is a read-only matrix. Custom role editing is not implemented. Demo mode uses `DEFAULT_ROLE_PERMISSIONS`. Live session prefers DB grants, falls back to defaults if empty.

---

## Biometric gateway — IMPLEMENTED

`lib/biometric/gateway.ts` `ingestBiometricRequest`:

1. Extract device token, hash, look up `biometric_devices`.
2. Persist raw payload (`biometric_raw_events`).
3. Parse with vendor adapter.
4. Persist normalized event.
5. Map device user -> employee (`biometric_identity_maps`).
6. Insert `attendance_punches` if mapped; else UNMAPPED.
7. Dedupe; touch device last-seen.

Public routes are unauthenticated except device token. Rate-limited. Simulator reuses the same pipeline.

---

## Adapter architecture — IMPLEMENTED

`BiometricAdapter`: `vendor`, `canParse`, `parse`.

Shipped: `esslAdapter` (ESSL / ZKTeco), `genericAdapter` (JSON). `adapterFor()` + fallback loop in `lib/biometric/adapters/index.ts`.

New vendor = new adapter file + registry entry. Do not rewrite the gateway.

**FUTURE:** Face, QR, GPS, mobile, pull-sync vendors.

---

## Normalized event architecture — IMPLEMENTED

- Raw: vendor payload, headers, hash, ingest status.
- Normalized: org, device, vendor, external user id, punch time (org timezone), direction IN/OUT/UNKNOWN, verification mode, mapping status.
- Punch: employee-linked attendance punch ready for Phase 4.

Pipeline stop today: punches. Days are not derived here.

---

## Attendance pipeline

| Stage | Status |
|---|---|
| Ingest punches | IMPLEMENTED (P3) |
| Leave marks on `attendance_days` | IMPLEMENTED (P5) |
| Holiday / weekly-off calendar data | IMPLEMENTED as leave/org data (P5 / org settings) |
| Day engine: PRESENT/ABSENT/late/OT from punches | **PLANNED (Phase 4)** |
| Smart Auto Attendance | **FUTURE** |
| QR + location fallback | **FUTURE** |
| Face attendance | **FUTURE** |

Salary already reads `attendance_days` (`loadAttendanceInputs`). Phase 4 should write those rows without wiping leave marks or punches.

---

## Salary pipeline — IMPLEMENTED (master) / PLANNED (run)

Implemented:

- Component catalog and structure items.
- Controlled formula parser (`lib/salary/formula.ts`) — no `eval`.
- `calculateStructure` (FIXED / PERCENTAGE / FORMULA / MANUAL / RESIDUAL).
- Effective-dated assignments; overlap blocked.
- Revisions close previous period day-before new `effective_from`; `salary_history`.
- `getEmployeeSalaryForDate(orgId, employeeId, date)` — contract for payroll.
- Variable earnings and reimbursements stored.

Planned (Phase 9+): monthly payroll run, proration using real attendance, PF/ESI/TDS/PT, payslips, processing variable/reimbursement/approved claims into net pay.

Salary never writes attendance or leave tables.

---

## Benefits and claims — IMPLEMENTED (master) / PLANNED (payroll)

Implemented:

- Benefit type catalog and scoped policies.
- Employee assignments with overlapping ACTIVE periods blocked.
- Claim types, travel policies, draft/submit/approve workflow (single-step or manager then finance).
- Policy validation engine (`lib/claims/engine.ts`) — eligibility, limits, duplicates, receipts, travel fields.
- TA/DA amounts from distance × rate + days × DA.
- `getApprovedPayrollClaimLines(orgId, period)` — contract for payroll.
- Receipts in `claim-receipts` (demo stores metadata only).

Planned (Phase 9): include approved claims in a payroll run, mark `INCLUDED_IN_PAYROLL` / `PAID`, statutory tax on benefits.

Claims never write salary, attendance or leave tables.

---

## Loans — IMPLEMENTED (master) / PLANNED (payroll)

Implemented:

- Loan type catalog (salary advance, employee loan, emergency, festival) with NONE / FLAT / REDUCING interest.
- Scoped eligibility policies.
- Application workflow: DRAFT → SUBMITTED → optional TWO_STEP (MANAGER then FINANCE) → APPROVED → DISBURSED.
- Disbursement creates a loan account, EMI schedule and append-only ledger.
- Manual repayments, skip / defer / waive / write-off adjustments.
- `quoteLoan` / `validateLoanApplication` in `lib/loans/engine.ts` — calculations are not in the UI.
- `getEmployeeLoanDeductions(orgId, employeeId, payrollPeriod)` — contract for payroll.

Planned (Phase 9): deduct EMI during a payroll run, write PAYROLL_DEDUCTION_REFERENCE ledger rows, mark installments payroll-paid.

Loans never write salary, attendance, leave or payroll tables.

---

## Future integration boundaries

Do not implement these until the named phase:

- **Phase 4:** shift/rules, punch-to-day, late/early, OT minutes, weekly-off/holiday application that does not erase leave.
- **Phase 7:** benefits, reimbursements, TA/DA and claims (implemented).
- **Phase 8:** loans and advances (implemented).
- **Phase 9:** payroll run consuming `getEmployeeSalaryForDate` + attendance inputs + approved variable/reimbursement + `getApprovedPayrollClaimLines` + `getEmployeeLoanDeductions`. Compliance filings.
- **Phase 10:** global reports hub (leave/salary/benefits/claims/loans already have in-module CSV).
- **Later:** employee self-service beyond `/profile`, Face/QR/GPS, smart auto attendance.

Keep prompts under 8,000 characters; point agents at `BSB_PAYROLL_PROJECT_STATE.md` instead of restating history.
