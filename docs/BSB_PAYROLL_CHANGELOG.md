# BSB Payroll Changelog

Entries record what landed in git, not planned work.

---

## Phase 12 — Employee exit, full & final settlement, contractor payroll

- **Date:** 2026-10-10
- **Status:** implemented on `261010-feat-exit-settlement-contractors`

### Implemented

- Additive overlay. Phases 1–11 unchanged. Phase 4 attendance still not started.
- Employee exits: DRAFT → SUBMITTED → APPROVED → IN_NOTICE / CLEARANCE_PENDING → SETTLEMENT_PENDING → SETTLED (CANCELLED). Cancel restores employee `ACTIVE`.
- Default clearance templates seed if the org has none. Required tasks block settlement; optional tasks do not.
- F&F settlement: DRAFT → CALCULATED / HAS_EXCEPTIONS → UNDER_REVIEW → APPROVED → FINALIZED → PARTIALLY_PAID / PAID (CANCELLED). Finalized rows are not silently edited.
- Calc uses effective-date salary on LWD, leave-written attendance, approved variables/claims, encashable leave × daily basic, notice shortfall/extra, outstanding loans, and Phase 11 `calculateStatutoryBreakdown`. `loadStatutory` is local in `lib/exits/settlement.ts`.
- Ordinary payroll excludes employees whose last working date is before the period (`employeeExcludedFromOrdinaryPayroll`).
- Settlement PDF after FINALIZED / PARTIALLY_PAID / PAID. Full payment marks the exit SETTLED and posts `recordLoanRepayment`.
- Contractors are distinct from employees. Invoice duplicate numbers need an authorized override reason. Withholding uses verified TDS rule versions; missing/unverified rules block calculation.

### Database

- Additive `supabase/phase12.sql`, appended into `combined.sql`.
- Tables: `exit_clearance_items`, `employee_exits`, `exit_clearance_tasks`, `final_settlements`, `settlement_line_items`, `settlement_approvals`, `settlement_payments`, `contractors`, `contractor_engagements`, `contractor_invoices`, `contractor_payment_items`, `contractor_payment_records`.
- Permissions: `exits.*`, `clearance.*`, `settlements.*`, `contractors.*`.
- Private storage bucket `settlement-statements`.

### API

- Server actions in `actions/exits.ts` with `writeAudit`.
- CSV: `/api/exits/reports/{register,notice,clearance}`, `/api/settlements/reports/{register,pending,paid}`, `/api/contractors/reports/{register,engagements,invoices,withholding}`.
- PDF: `/api/settlements/[id]/pdf`.

### UI

- `/employees/exits`, `/settlements`, `/contractors`, `/contractor-payments`.
- Dashboard shortcuts for Exits, Settlements, Contractors.
- Nav items: Exits, Settlements, Contractors.

### Limitations

- Seed statutory versions remain DISABLED/unverified; contractor withholding is blocked until a verified TDS version exists.
- Phase 4 attendance calculation is not started. F&F proration uses leave-written days plus unmarked working days as paid.
- No demo exits, settlements or contractors; only clearance templates are seeded.

---

## Phase 11 — Versioned India statutory and tax engine

- **Date:** 2026-10-08
- **Status:** implemented in working tree (not yet committed)

### Implemented

- Versioned PF/ESI/PT/LWF/TDS engine in `lib/statutory/engine.ts`. Payroll calculate persists `payroll_statutory_results` / `lines`.
- Employer contributions are not deducted from net pay. Payslips show real statutory amounts; employer section is optional.
- ACTIVE versioned rules win; otherwise Phase 9 `statutory_rules` with a warning. Unverified versions warn; missing TDS/LWF leave amounts at 0.
- Org LWF and TDS default off. Employee flags: LWF, TDS, tax regime, PF number, PT state.
- Exception codes: `STATUTORY_RULE_MISSING`, `STATUTORY_UAN_MISSING`, `STATUTORY_PAN_MISSING`, `STATUTORY_UNVERIFIED_RULE`.
- Compliance pages: rules, settings, declarations, proofs, forms, reports, LWF CSV.

### Database

- Additive `supabase/phase11.sql`, appended into `combined.sql`.
- Tables: `statutory_rule_versions`, `org_statutory_settings`, tax declarations/items/proofs, `payroll_statutory_results` / `lines`.
- Permissions: `compliance.manage|rules.manage|tax.manage|proofs.review`.
- Private storage bucket `tax-proofs`.

### Limitations

- Seed rule versions are DISABLED and unverified. Official rates were not independently verified in this environment.
- Phase 4 attendance calculation is not started.

---

## Phase 10 — Review, approval, finalization and payslip foundation

- **Date:** 2026-10-06
- **Status:** implemented in working tree (not yet committed)

### Implemented

- Overlay on Phase 9 run: DRAFT → CALCULATED → UNDER_REVIEW → APPROVAL_PENDING → APPROVED → FINALIZED → LOCKED → PROCESSED → PAID, plus CANCELLED.
- Exception scan after calculate. ERROR blocks review/approval. WARNING must be acknowledged and audited.
- Two-step approve. Reject/return-to-draft require a reason. Finalize writes snapshot + finalization log.
- Recalculate only DRAFT/CALCULATED. Finalized cannot unlock. Processed/paid cannot be adjusted in place.
- Payslip numbers `PREFIX/FY/MON/000001`. Server-side PDF in private `payslips` bucket. Statutory sections reserved at 0.
- Adjustments as earning/deduction lines with required reason.

### Database

- Additive `supabase/phase10.sql`, appended into `combined.sql`.
- Tables: `payroll_exceptions`, `payroll_approval_history`, `payroll_snapshots`, `payroll_finalization_logs`, `payroll_adjustments`, `payslip_line_items`, `payslip_sequences`.
- Permissions: `payroll.review|approve|reject|finalize|adjust`, `payslip.generate|export`.
- Private storage bucket `payslips`. RLS enabled.

### API

- Server actions: submit/approve/reject/return/finalize/cancel, acknowledge/resolve exception, adjustment, generate payslips.
- CSV: `/api/payroll/reports/{register,sheet,employee,earnings,deductions,approval,bank,payslips}`.
- PDF: `/api/payroll/payslips/[id]/pdf`.

### UI

- `/payroll/review`, `/payroll/review/[runId]/[employeeId]`, `/payroll/exceptions`.
- Run detail workflow buttons and approval history.
- Payslip number, reserved statutory sections, PDF download.

### Limitations

- Phase 4 attendance calculation is not started.
- Phase 11 statutory filing is not started; payslip PF/ESI/PT/TDS/LWF remain reserved.

---

## Phase 9 — Payroll & Compliance

- **Date:** 2026-10-05
- **Status:** implemented in working tree (not yet committed)

### Implemented

- Monthly payroll run: DRAFT → CALCULATED → LOCKED → PROCESSED → PAID. One run per YYYY-MM.
- Recalculate until lock; hold/include employees; process issues payslips; mark paid.
- Statutory PF (BASIC+DA, ceiling), ESI wage-band, PT slabs, optional TDS %.
- Consumes `getEmployeeSalaryForDate`, approved variable/reimbursement, `getApprovedPayrollClaimLines`, `getEmployeeLoanDeductions`.
- Process posts loan EMI via `recordLoanRepayment` (`source: "PAYROLL"`) and marks claims `INCLUDED_IN_PAYROLL`; mark-paid sets claims `PAID`.
- Unmarked working days count as paid until Phase 4 attendance calculation.
- Demo seed: PF, ESI, Karnataka PT, disabled TDS. No pre-calculated run.

### Database

- Additive `supabase/phase9.sql`, appended into `combined.sql`.
- Tables: `statutory_rules`, `payroll_runs`, `payroll_items`, `payroll_lines`, `payslips`, `compliance_filings`.
- Permissions: `payroll.view`, `payroll.process`, `payroll.lock`, `payroll.payslip.view`, `payroll.export`, `payroll.settings`, `compliance.view`, `compliance.export`.
- RLS enabled.

### API

- Server actions in `actions/payroll.ts`.
- CSV: `/api/payroll/reports/{register,sheet,bank,payslips}`, `/api/compliance/reports/{pf,esi,pt,tds}`.

### UI

- `/payroll` and sub-routes: runs, runs/[id], employees, payslips, payslips/[id], reports, settings.
- `/compliance` and PF/ESI/PT/TDS pages.
- Nav items Payroll (`Wallet`) and Compliance (`ShieldCheck`).
- Employee profile Payroll tab and dashboard shortcuts.

### Limitations

- Phase 4 attendance calculation is not started; LOP/present from punches is not available.
- TDS is an optional percentage, not a full slab engine.
- Global reports hub remains Phase 10.

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
