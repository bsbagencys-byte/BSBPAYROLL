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
- Employee self-service lives under `app/(app)/my` with `lib/ess/*` and `actions/ess.ts`.
- Reports, accounting and payments live under `app/(app)/{reports,accounting,payments}` with `lib/{reports,accounting,payments}/*`.
- Notifications, automation and developer settings live under `app/(app)/{notifications,automation,settings/notifications,settings/developers}`.
- Analytics live under `app/(app)/analytics` with `lib/analytics/*` and optional `lib/ai/*`.
- Demo vs production is transparent to pages: repositories switch on `hasSupabaseConfig()` / `isDemoMode()`.
- `allowedDevOrigins`: `*.monkeycode-ai.live`.

Not a separate SPA. No client-side service-role keys.

---

## Backend — IMPLEMENTED

Single Next.js process.

- **Mutations:** `"use server"` actions in `actions/*.ts`.
- **Public HTTP:** biometric ingest (`/api/biometric/push`, `/api/biometric/webhook`); scoped `/api/v1/*` (API key); `/api/internal/jobs` (worker secret); `/api/health` and `/api/health/live`.
- **Authenticated HTTP:** self-service document and tax-proof signed URLs are server actions, not public routes. CSV report downloads under `/api/leave/reports/*`, `/api/salary/reports/*`, `/api/benefits/reports/*`, `/api/claims/reports/*`, `/api/loans/reports/*`, `/api/payroll/reports/*`, `/api/compliance/reports/*`, `/api/exits/reports/*`, `/api/settlements/reports/*`, `/api/contractors/reports/*`, `/api/reports/[key]`, `/api/accounting/journals/[id]/csv`, `/api/payments/[id]/csv` and `/api/analytics/[kind]`. Payslip PDF under `/api/payroll/payslips/[id]/pdf`. Settlement PDF under `/api/settlements/[id]/pdf`.
- **Data:** `createAdminClient()` (service role) or `getDemoStore()`.
- **Audit:** `writeAudit()` to `audit_logs` or in-memory ring.
- **Rate limit:** in-memory for login, biometric ingest and `/api/v1`.
- **Jobs:** durable outbox + claimed `job_executions`. Worker is `POST /api/internal/jobs`, not an in-process timer.

---

## Database — IMPLEMENTED

PostgreSQL via Supabase. Fresh install: `supabase/combined.sql`. Incremental phase files: `schema.sql`, `phase2.sql`, `phase3.sql`, `phase5.sql`, `phase6.sql`, `phase7.sql`, `phase8.sql`, `phase9.sql`, `phase10.sql`, `phase11.sql`, `phase12.sql`, `phase13.sql`, `phase14.sql`, `phase15.sql`, `phase16.sql`, `phase17.sql`. Dev seed: `supabase/seed.sql`.

Every business table is org-scoped. RLS on. Triggers for `updated_at`.

See `BSB_PAYROLL_PROJECT_STATE.md` for the table list. There is no Phase 4 schema file.

Storage: private buckets `employee-documents`, `claim-receipts`, `payslips`, `tax-proofs`, `settlement-statements` and `payment-exports`.

---

## Authentication — IMPLEMENTED

Username + password, not email-as-identity in the UI.

1. Username maps to synthetic email `{username}@{AUTH_EMAIL_DOMAIN}` (`username_lookup`).
2. Demo: cookie `bsb_demo_session` = profile id; passwords in demo store.
3. Live: Supabase `signInWithPassword` after lookup. Failed/success rows in `login_attempts`.
4. Session: `getSessionUser()` loads profile, `organization_users`, role, permission codes. `organizations.status = SUSPENDED` yields no session.
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

Payroll (Phase 9) consumes `getEmployeeSalaryForDate`, approved variable/reimbursement, and prorates using leave-written attendance days (unmarked working days paid until Phase 4).

Salary never writes attendance or leave tables.

---

## Benefits and claims — IMPLEMENTED

Implemented:

- Benefit type catalog and scoped policies.
- Employee assignments with overlapping ACTIVE periods blocked.
- Claim types, travel policies, draft/submit/approve workflow (single-step or manager then finance).
- Policy validation engine (`lib/claims/engine.ts`) — eligibility, limits, duplicates, receipts, travel fields.
- TA/DA amounts from distance × rate + days × DA.
- `getApprovedPayrollClaimLines(orgId, period)` — contract for payroll.
- Receipts in `claim-receipts` (demo stores metadata only).

Payroll (Phase 9) includes approved claims, marks `INCLUDED_IN_PAYROLL` on process and `PAID` on mark-paid. Statutory tax on benefits is still a placeholder.

Claims never write salary, attendance or leave tables.

---

## Loans — IMPLEMENTED

Implemented:

- Loan type catalog (salary advance, employee loan, emergency, festival) with NONE / FLAT / REDUCING interest.
- Scoped eligibility policies.
- Application workflow: DRAFT → SUBMITTED → optional TWO_STEP (MANAGER then FINANCE) → APPROVED → DISBURSED.
- Disbursement creates a loan account, EMI schedule and append-only ledger.
- Manual repayments, skip / defer / waive / write-off adjustments.
- `quoteLoan` / `validateLoanApplication` in `lib/loans/engine.ts` — calculations are not in the UI.
- `getEmployeeLoanDeductions(orgId, employeeId, payrollPeriod)` — contract for payroll.

Payroll (Phase 9) deducts EMI via `getEmployeeLoanDeductions` and posts `recordLoanRepayment` (`source: "PAYROLL"`).

Loans never write salary, attendance or leave tables.

---

## Payroll and compliance — IMPLEMENTED

- Monthly run workflow: DRAFT → CALCULATED → UNDER_REVIEW → APPROVAL_PENDING → APPROVED → FINALIZED → LOCKED → PROCESSED → PAID (CANCELLED).
- Engine in `lib/payroll/engine.ts`: period bounds, attendance summary, proration. Statutory overlay in `lib/statutory/engine.ts`.
- Overlay in `lib/payroll/{workflow,exceptions,numbering,pdf}.ts`: review, exceptions, finalize snapshot, payslip PDF.
- Service consumes `getEmployeeSalaryForDate`, approved variable/reimbursement, `getApprovedPayrollClaimLines`, `getEmployeeLoanDeductions`, `calculateStatutoryBreakdown`.
- Unmarked working days count as paid until Phase 4 attendance calculation exists.
- Process posts loan EMI (`source: "PAYROLL"`), marks claims `INCLUDED_IN_PAYROLL`, generates numbered PDFs if missing. Mark-paid sets claims `PAID`.
- Compliance filings (PF/ESI/PT/TDS/LWF) generated on process. Payslips show employee statutory deductions; employer cost is separate from net.

Payroll never writes attendance or leave tables.

---

## Employee exit, F&F and contractors — IMPLEMENTED

- Exit workflow: DRAFT → SUBMITTED → APPROVED → IN_NOTICE / CLEARANCE_PENDING → SETTLEMENT_PENDING → SETTLED (CANCELLED). Cancel restores employee `ACTIVE`.
- Clearance templates seed if the org has none. Required tasks block settlement; optional tasks do not.
- Settlement workflow: DRAFT → CALCULATED / HAS_EXCEPTIONS → UNDER_REVIEW → APPROVED → FINALIZED → PARTIALLY_PAID / PAID (CANCELLED). Finalized rows are not silently edited.
- Calc in `lib/exits/settlement.ts` uses `getEmployeeSalaryForDate` on LWD, leave-written attendance, approved variables/claims, encashable leave × daily basic, notice shortfall/extra, outstanding loans, and `calculateStatutoryBreakdown`. `loadStatutory` is local (no payroll-service import).
- Ordinary payroll excludes employees whose last working date is before the period (`employeeExcludedFromOrdinaryPayroll` in `lib/exits/service.ts`).
- Settlement PDF after FINALIZED / PARTIALLY_PAID / PAID. Full payment marks the exit SETTLED and posts `recordLoanRepayment`.
- Contractors are not employees. Invoices: DRAFT → SUBMITTED → APPROVED / REJECTED → PARTIALLY_PAID / PAID. Duplicate invoice numbers require an authorized override reason. Withholding uses verified Phase 11 TDS versions; missing/unverified rules block calculation.

Exits never write attendance or leave tables.

---

## Employee self-service (ESS) — IMPLEMENTED

- Additive overlay at `/my`. Reuses existing services: `loadEmployeeLeave`, `loadClaimListItems`, `loadLoanListItems` / `loadAccountListItems`, `loadPayslipViews`, `loadEmployeeCompensation`, `getEmployeeRecord`, `loadLeaveOverview`, statutory declaration queries.
- Identity is resolved server-side in `lib/ess/identity.ts` (`resolveSelfEmployee`) from the authenticated `SessionUser` → `employees.user_id`. A browser-supplied employee id is never used for authorisation. RLS adds `public.current_employee_ids()` and restricts `ess_change_requests` reads to the current employee or an authorized reviewer.
- Unlinked users see an explicit setup state; no employee or organisation data is rendered.
- Routes: `/my`, `/my/profile`, `/my/attendance`, `/my/leave`, `/my/payslips`, `/my/salary`, `/my/claims`, `/my/loans`, `/my/documents`, `/my/tax-documents`, `/my/requests`, `/my/notifications`, `/my/team`.
- Profile change requests (`ess_change_requests`) are the only write path for personal data. Bank and statutory categories are sensitive and are never auto-applied: approval records the decision and notifies the employee; HR applies the value through the employee master.
- Downloads: payslips use `/api/payroll/payslips/[id]/pdf`; employee documents use short-lived signed URLs through `getSelfDocumentUrlAction`, which re-checks ownership. No public document URLs.
- Sensitive values are masked in ESS (`maskAccountNumber`, `maskPan`, `maskAadhaarLast4`, `maskIdentifier`).
- Notifications (`ess_notifications`) remain the ESS inbox. Phase 15 extends those rows with `event_type` and `delivery_status`. Email is optional SMTP only; WhatsApp/SMS are not implemented. Managers see only direct reports (`reporting_manager_id`) in `/my/team`; decisions link to existing leave/claims/loans approval screens, so no second approval engine is introduced.
- No QR, GPS, face recognition, smart auto attendance, raw punch editing or leave-balance bypass.

---

## Reports, accounting and payments — IMPLEMENTED

- Reports hub at `/reports` (`lib/reports/{catalog,query,csv}.ts`). Payroll register/gross-net/cost use stored run and item totals. Phase 4 late/early/OT/present-absent return an explicit not-calculated table.
- Journals (`lib/accounting/service.ts`) consume finalized snapshot payload. Unmapped components block export. Debit must equal credit. One non-VOID journal per run. Duplicate export requires confirmation. Generic CSV (`lib/accounting/csv.ts`) — no Tally/Zoho.
- Payment batches (`lib/payments/service.ts`) from finalized runs. Bank-file export is an instruction (`EXPORTED` ≠ paid). Exclusion requires a reason and does not change finalized net. Bank details masked. Configurable generic CSV columns (`lib/payments/columns.ts`). Outcomes append history. Reconciliation confirms MATCHED rows only.
- No XLSX library. No direct bank API.

---

## Automation, notifications, APIs and webhooks — IMPLEMENTED

- Domain events via `emitSafe` → `emitDomainEvent` write `domain_events` and a durable `event_outbox`. `processOutbox` fans out notifications, rules and webhooks. No in-request timers.
- In-app notifications default from `defaultNotificationPlan`. Email only if preference `email=true` and SMTP is configured. Recipient is `employee_employment.official_email`. Unconfigured SMTP is UNCONFIGURED, never success.
- Automation rules: predefined triggers/conditions/actions only. No user SQL/code. Payroll create/finalize never auto-runs without an authorized policy.
- Jobs claimed uniquely on `(job_id, scheduled_for)`. Worker `POST /api/internal/jobs` requires `JOBS_WORKER_SECRET`.
- Webhooks: HMAC + timestamp + event id, secret rotation, retry/backoff, SSRF block of localhost/private/metadata. Signing secret is encrypted at rest (`secret_encrypted`) when `SESSION_SECRET` is set. No passwords, tokens, full bank or Aadhaar in payloads.
- API keys: `bsb_live_` prefix, sha256 hash, org-scoped, granular read scopes, expiry/revoke/rotate, rate limit, request IDs. Plaintext shown only at create. Cannot bypass RLS/approvals/finalized payroll.
- `/api/v1` attendance summaries do not claim Phase 4 punch calculation.

---

## Future integration boundaries

Do not implement these until the named phase:

- **Phase 4:** shift/rules, punch-to-day, late/early, OT minutes, weekly-off/holiday application that does not erase leave.
- **Phase 7:** benefits, reimbursements, TA/DA and claims (implemented).
- **Phase 8:** loans and advances (implemented).
- **Phase 9:** payroll run and compliance (implemented). Consumes salary, leave-written days, claims and loans.
- **Phase 10:** review, approval, finalization, lock and payslip foundation (implemented).
- **Phase 11:** versioned statutory/tax engine (implemented). Do not hard-code rates in payroll.
- **Phase 12:** employee exit, F&F settlement and contractor payroll (implemented). Do not mix contractor invoices into employee payroll runs.
- **Phase 13:** employee self-service at `/my` (implemented). Additive only; reuse module services and approvals.
- **Phase 14:** reports hub, accounting exports and bank payment infrastructure (implemented).
- **Phase 15:** automation, notifications, scheduled jobs, APIs and webhooks (implemented).
- **Phase 16:** AI and advanced analytics (implemented). Additive overlay. Core analytics work without an AI API. Alerts never mutate payroll.
- **Phase 17:** production readiness (implemented). Tests, health, ops docs, security/integrity fixes. Go-live is READY WITH DOCUMENTED LIMITATIONS.
- **Later:** Face/QR/GPS, smart auto attendance.

## Production readiness — IMPLEMENTED (limited)

- Tests: `npm test` (node test runner, no extra deps).
- Health: `/api/health`, `/api/health/live`.
- Go-live checklist: `docs/PRODUCTION_GO_LIVE_CHECKLIST.md`.
- Ops: `docs/ops/{BACKUP,DEPLOY,SAAS,INCIDENT}.md`.
- Verdict: READY WITH DOCUMENTED LIMITATIONS. Phase 4, hardware certification and statutory source verification remain open.

Keep prompts under 8,000 characters; point agents at `BSB_PAYROLL_PROJECT_STATE.md` instead of restating history.
