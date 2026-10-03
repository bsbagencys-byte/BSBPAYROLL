# BSB Payroll Changelog

Entries record what landed in git, not planned work.

---

## Phase 8 — Loans & Advances

- **Date:** 2026-10-03
- **Status:** implemented in working tree (not yet committed)

### Implemented

- Configurable loan types (salary advance, employee loan, emergency, festival) with NONE / FLAT / REDUCING interest.
- Loan policies with org / branch / department / designation / employment-type / employee scope.
- Application raise / draft / submit / approve / reject / cancel / disburse.
- Workflow: DRAFT → SUBMITTED → optional TWO_STEP (MANAGER then FINANCE) → APPROVED → DISBURSED.
- Disbursement creates a loan account, EMI schedule and append-only ledger.
- Manual repayments (cash/bank), skip / defer / waive / write-off adjustments.
- Engine quotes EMI (zero-interest = principal / tenure; reducing uses EMI formula). Policy validation on submit.
- Salary advance is a loan type with a full recovery schedule, not a single balance field.
- `getEmployeeLoanDeductions(organizationId, employeeId, payrollPeriod)` for a later payroll run. Does not process payroll.
- Demo seed: Asha ₹20k salary advance (4×₹5k, 1 paid); Meera pending reducing loan; Rahul festival draft.

### Database

- Additive `supabase/phase8.sql`, appended into `combined.sql`.
- Tables: `loan_types`, `loan_policies`, `loan_applications`, `loan_accounts`, `loan_schedule`, `loan_repayments`, `loan_adjustments`, `loan_approvals`, `loan_ledger`.
- Permissions: `loans.view`, `loans.create`, `loans.edit`, `loans.approve`, `loans.disburse`, `loans.repayment.manage`, `loans.adjust`, `loans.export`, `loans.settings`.
- RLS enabled.

### API

- Server actions in `actions/loans.ts`.
- CSV: `/api/loans/reports/{register,active,outstanding,schedule,repayments,advances,overdue,statement}`.

### UI

- `/loans` and sub-routes: types, applications, applications/new, applications/[id], active, accounts/[id], repayments, history, settings.
- Nav item Loans (`HandCoins`). Payroll nav stays phase 9.
- Employee profile Loans tab and dashboard shortcut.

### Limitations

- No payroll run, PF/ESI/TDS/PT, or payslips.
- EMI payroll deduction is a contract only; this UI does not mark installments payroll-paid.
- Attendance calculation remains Phase 4.

---

## Phase 7 — Benefits, Reimbursements, TA/DA & Claims

- **Date:** 2026-10-02
- **Status:** implemented in working tree (not yet committed)

### Implemented

- Configurable benefit types (fuel, telephone, internet, medical, travel, meal, other) with FIXED / PERCENTAGE / MANUAL methods.
- Benefit policies with org / branch / department / designation / employment-type / employee scope.
- Employee benefit assignments with overlapping ACTIVE periods blocked; close previous period when a later assignment starts.
- Configurable claim types, travel policies (DA/day, mileage, hotel, meal, max amount/days), and two-step or single-step approval.
- Claim raise / draft / submit / approve / reject / request-correction / cancel.
- Policy engine checks: type active, date validity, eligibility, max amount, duplicate period, receipt, travel duration, mileage, conveyance.
- TA/DA calculation: distance × rate + days × DA.
- Receipt upload to private `claim-receipts` bucket (demo stores metadata only).
- `getApprovedPayrollClaimLines(organizationId, period)` for a later payroll run. Does not process payroll.
- Demo seed: four benefit types, three assignments, four claim types/policies, approved fuel claim, pending outstation claim, draft medical claim.

### Database

- Additive `supabase/phase7.sql`, appended into `combined.sql`.
- Tables: `benefit_types`, `benefit_policies`, `employee_benefits`, `claim_types`, `claim_policies`, `claims`, `claim_items`, `claim_approvals`, `claim_policy_checks`, `claim_attachments`.
- Permissions: `benefits.view`, `benefits.manage`, `benefits.assign`, `claims.view`, `claims.create`, `claims.edit`, `claims.approve`, `claims.manage`, `claims.export`.
- RLS enabled. Storage bucket `claim-receipts`.

### API

- Server actions in `actions/claims.ts`.
- CSV: `/api/benefits/reports/{types,assignments}`, `/api/claims/reports/{claims,pending,approved,policies}`.

### UI

- `/benefits` and sub-routes: components, policies, employee, reports.
- `/claims` and sub-routes: new, pending, approvals, approved, history, policies, reports, `[id]`.
- Nav items Benefits (`Gift`) and Claims (`Receipt`). Payroll nav moved to phase 9.
- Employee profile Benefits and Claims tabs.

### Limitations

- No payroll run, PF/ESI/TDS/PT or payslips.
- Tax treatment is stored as a placeholder only.
- Approved claims are not paid or included in a payroll period from this UI.
- Attendance calculation remains Phase 4.

---

## Phase 6 — Salary & Compensation Engine

- **Date:** 2026-09-30
- **Commit:** `1f821be`

### Implemented

- Configurable salary components and structures (FIXED, PERCENTAGE, FORMULA, MANUAL, RESIDUAL).
- Controlled formula parser (no `eval`).
- Employee assignments with effective dates; overlapping ACTIVE periods blocked.
- Revisions: approve closes previous period day before new `effective_from`; history row written; previous CTC not overwritten.
- `getEmployeeSalaryForDate` for later payroll.
- Variable earnings and reimbursements stored (not processed).
- Demo seed (Basic/HRA/DA/TA/Special + assignments/history).
- Employee profile Salary tab and dashboard shortcut.

### Database

- Additive `supabase/phase6.sql`, appended into `combined.sql`.
- Tables: `salary_components`, `salary_structures`, `salary_structure_items`, `employee_salary_assignments`, `salary_revisions`, `salary_history`, `variable_earnings`, `reimbursement_entries`.
- Permissions: `salary.view`, `salary.manage`, `salary.component.manage`, `salary.structure.manage`, `salary.revision.create`, `salary.revision.approve`, `salary.history.view`.
- RLS enabled.

### API

- Server actions in `actions/salary.ts`.
- CSV: `/api/salary/reports/{structures,compensation,revisions,ctc,without,variable}`.

### UI

- `/salary` and sub-routes: components, structures, employee, revisions, history, variable, reimbursements, reports, settings.
- Nav item Salary (`Banknote`).

### Limitations

- No payroll run, PF/ESI/TDS/PT, payslips.
- `lateCount` / `otMinutes` always 0 until Phase 4.
- Proration not finalized.
- Variable/reimbursement not paid through payroll.

---

## Phase 5 — Leave & Holiday Management

- **Date:** 2026-09-29
- **Commit:** `761b7d6`

### Implemented

- Configurable leave types and policies; request/approve/reject/cancel/withdraw.
- Day engine skips weekly-off and holidays unless policy counts them.
- Half-day sessions; overlap blocked for PENDING/APPROVED.
- Balance ledger; holiday calendar; comp-off.
- Approved leave writes thin `attendance_days`; cancel restores previous status; punches not erased.

### Database

- `supabase/phase5.sql` (also in `combined.sql`).
- Leave tables plus `attendance_days`.
- Leave permission codes + RLS.

### API

- `actions/leave.ts`.
- CSV: `/api/leave/reports/{requests,balances,holidays,attendance}`.

### UI

- `/leave` and sub-routes including types, policies, requests, approvals, balances, calendar, holidays, comp-off, reports, settings.
- Employee Leave tab.

### Limitations

- Does not calculate PRESENT/ABSENT from punches.
- Accrual is ledger-based; not a full scheduled accrual job.

---

## Phase 3 — Universal Biometric Ingest

- **Date:** 2026-09-27
- **Commit:** `6851ad4`

### Implemented

- Device registry, hashed tokens, identity mapping.
- Gateway: raw -> adapter -> normalized -> punch.
- Adapters: eSSL / ZKTeco and generic JSON.
- Simulator, live punches, logs.
- Public ingest routes, rate-limited.

### Database

- `supabase/phase3.sql`: `biometric_devices`, `biometric_identity_maps`, `biometric_raw_events`, `biometric_normalized_events`, `attendance_punches`.

### API

- `POST /api/biometric/push`, `POST /api/biometric/webhook` (public prefixes in `proxy.ts`).
- `actions/biometric.ts`.

### UI

- `/biometric` devices, mapping, punches, live, logs, simulator.

### Limitations

- Ingest only. No attendance day calculation. No Face/QR/GPS/mobile.

---

## Schema packaging

- **Date:** 2026-09-27
- **Commit:** `4778f6f` — `supabase/combined.sql` for SQL Editor.
- Later phases appended P5, P6 and P7 into the same file. File header is Phase 1+2+3+5+6+7.

---

## Phase 1 + Phase 2 — Foundation and Employees

- **Date:** 2026-09-26
- **Commit:** `a8db4f2`
- **Follow-up:** `59a45ab` (2026-09-27) Vercel env docs, Node 20.

### Implemented

- Username/password login, demo mode, setup wizard, dashboard, company settings.
- Org master: branches, departments, designations, locations, employment types.
- Users, read-only roles matrix, security/audit view.
- Employee CRUD, documents, status, history, CSV import, hierarchy.
- RBAC, RLS, audit logs, `username_lookup`.

### Database

- `supabase/schema.sql` (P1), `supabase/phase2.sql` (employees + storage).

### API

- Server actions: `auth`, `setup`, `users`, `org`, `employees`. No public REST for these.

### UI

- Auth, setup, dashboard, settings, employees routes listed in README.

### Limitations

- Custom role editing not built.
- Excel import not supported.
- Profile photo upload deferred in UI copy.
- Attendance, payroll, compliance, global reports not built.

---

## Initial commit

- **Date:** 2026-09-25
- **Commit:** `3ed9b2f`

Scaffold / empty project start.

---

## Not shipped

| Phase | Status |
|---|---|
| 4 Attendance calculation | Not started — no SQL, pages, or engine |
| 7 Payroll processing | Nav disabled |
| 9 Compliance | Nav disabled |
| 10 Global reports | Nav disabled; leave/salary have in-module CSV |
