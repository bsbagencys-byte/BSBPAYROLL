# BSB Payroll — Project State

Before implementing any future BSB Payroll phase, read this file first. Do not rediscover or rewrite completed architecture. Implement only the current requested delta and update this file afterward.

---

## Project

- **Product:** BSB Payroll
- **Repo:** `bsbagencys-byte/BSBPAYROLL`, branch `261015-feat-ess-portal` (Phase 15 overlay)
- **Stack:** Next.js 16.3.6 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, Zod 4, Supabase Auth + PostgreSQL + RLS (`@supabase/ssr`, `@supabase/supabase-js`). Node `>=20`.
- **Runtime modes:** Demo in-memory store when unconfigured or `NEXT_PUBLIC_DEMO_MODE=true`. Production: real Supabase, `NEXT_PUBLIC_DEMO_MODE=false`. Service-role key is server-only.
- **Status:** Phases 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 implemented. Phase 4 Attendance is not started.

---

## Completed

Status is from code, not README.

| Phase | Status | Evidence |
|---|---|---|
| 1 Foundation | **COMPLETE** (partial: custom role editing) | Login, setup, dashboard, org settings, users, audit, RBAC. Roles page is a read-only matrix. |
| 2 Employee & Organization | **COMPLETE** | Employee master, employment, statutory, bank, documents, history, CSV import, hierarchy. |
| 3 Universal Biometric | **COMPLETE** (ingest only) | Devices, mapping, gateway, eSSL + generic adapters, raw/normalized events, punches. Does not calculate days. |
| 4 Attendance | **NOT STARTED** | Nav `enabled: false`. No `/attendance` page, no `phase4.sql`, no shift/late/OT engine. Thin `attendance_days` exists for leave marks only. |
| 5 Leave & Holiday | **COMPLETE** | Types, policies, requests, approvals, balances/ledger, holidays, calendar, comp-off, CSV reports. Approved leave writes `attendance_days`. |
| 6 Salary & Compensation | **COMPLETE** for master CTC; consumed by P9 | Components, structures, assignments, revisions, history, formula parser, variable/reimbursement storage. `lateCount` / `otMinutes` stubbed at `0`. |
| 7 Benefits, Reimbursements, TA/DA & Claims | **COMPLETE**; consumed by P9 | Types, policies, assignments, claims, approvals, policy engine, TA/DA calc, receipts, CSV. `getApprovedPayrollClaimLines` used by payroll. Process marks `INCLUDED_IN_PAYROLL`; mark-paid sets `PAID`. |
| 8 Loans & Advances | **COMPLETE**; consumed by P9 | Types, policies, applications, accounts, EMI schedule, ledger, repayments, adjustments. `getEmployeeLoanDeductions` used by payroll. Process posts `recordLoanRepayment` (`source: "PAYROLL"`). |
| 9 Payroll & Compliance | **COMPLETE** with Phase 4 attendance gap | Monthly run, proration from leave-written days (unmarked working days paid), PF/ESI/PT/TDS, payslips, lock/process/paid, CSV, compliance filings. |
| 10 Review / Finalize / Payslip | **COMPLETE** overlay on P9 | Review, exceptions, two-step approval, finalize+snapshot, lock after finalize, numbered PDF payslips, adjustments. |
| 11 Statutory / tax engine | **COMPLETE** overlay on P9/P10 | Versioned PF/ESI/PT/LWF/TDS, org settings, tax declarations, payroll statutory snapshots, real payslip deductions. Seed versions DISABLED/unverified. |
| 12 Exit, F&F, contractors | **COMPLETE** overlay on P9–P11 | Employee exits + clearance, full & final settlement, contractor register/engagements/invoices. Ordinary payroll excludes exited employees whose LWD is before the period. |
| 13 Employee self-service | **COMPLETE** overlay on P2/P5/P7/P8/P9/P11 | `/my` portal: profile, attendance, leave, payslips, salary, claims, loans, documents, tax, requests, notifications, manager team view. Server-resolved identity; profile change requests; in-app notifications. |
| 14 Reports, accounting, payments | **COMPLETE** overlay on P9–P13 | Reports hub from stored data; payroll journals from finalized snapshots; payment batches and generic bank CSV. Late/OT/punch LOP not calculated. |
| 15 Automation, notifications, APIs | **COMPLETE** overlay on P1–P14 | Durable outbox, in-app + optional SMTP email, predefined automation rules, scheduled jobs, HMAC webhooks, scoped `/api/v1`. Never fakes external delivery. |

---

## Locked Decisions

- Username + password login (synthetic auth email, never shown in UI).
- Online SaaS.
- Next.js + Supabase architecture.
- Multi-tenant organization model (`organization_id` on business tables).
- Supabase RLS.
- RBAC + audit logs.
- Universal biometric architecture (vendor adapter, not eSSL-only).
- eSSL first; generic JSON adapter also shipped.
- Normalized biometric events, then punches.
- Pipeline: Biometric ingest -> Attendance calculation -> Payroll. Do not skip Phase 4.
- Smart Auto Attendance later.
- Dynamic QR + location later (fallback).
- Face attendance later.
- Do not build future phases prematurely.
- MonkeyCode prompts must remain below 8,000 characters with a safe buffer.
- Demo mode without live Supabase.
- Never prefix service-role keys with `NEXT_PUBLIC_`.
- Next.js 16 uses `proxy.ts` (no `middleware.ts`).
- Mutations are server actions; public HTTP APIs are biometric ingest, scoped `/api/v1` (API key), CSV downloads, and `/api/internal/jobs` (worker secret).
- Salary is effective-date based and auditable; previous CTC is never overwritten.
- Formula engine is a controlled parser, not `eval`.
- Attendance and leave are read-only inputs to salary; salary never writes those tables.

---

## Current Modules

Enabled nav: Dashboard, My Space, Employees, Leave, Salary, Benefits, Claims, Loans, Biometric, Payroll, Exits, Settlements, Contractors, Reports, Accounting, Payments, Notifications, Automation, Compliance, Settings.

Disabled nav (no pages): `/attendance` (P4).

### Auth / foundation

- `/login`, `/forgot-password`, `/reset-password`, `/unauthorized`, `/setup`, `/dashboard`, `/profile`

### Employee self-service (P13)

- `/my`, `/my/profile`, `/my/attendance`, `/my/leave`, `/my/payslips`, `/my/salary`, `/my/claims`, `/my/loans`, `/my/documents`, `/my/tax-documents`, `/my/requests`, `/my/notifications`, `/my/team`

### Settings

- `/settings/company`, `/branches`, `/departments`, `/designations`, `/locations`, `/employment-types`, `/users`, `/roles`, `/security`, `/notifications`, `/developers`

### Employees (P2)

- `/employees`, `/employees/new`, `/employees/[id]`, `/employees/import`, `/employees/hierarchy`

### Biometric (P3)

- `/biometric`, `/biometric/devices/new`, `/biometric/devices/[id]`, `/biometric/mapping`, `/biometric/punches`, `/biometric/live`, `/biometric/logs`, `/biometric/simulator`
- `POST /api/biometric/push`, `POST /api/biometric/webhook` (public, token + rate limit)

### Leave (P5)

- `/leave`, `/requests`, `/approvals`, `/balances`, `/calendar`, `/holidays`, `/types`, `/policies`, `/comp-off`, `/reports`, `/settings`
- CSV: `/api/leave/reports/{requests,balances,holidays,attendance}`

### Salary (P6)

- `/salary`, `/components`, `/structures`, `/employee`, `/revisions`, `/history`, `/variable`, `/reimbursements`, `/reports`, `/settings`
- CSV: `/api/salary/reports/{structures,compensation,revisions,ctc,without,variable}`

### Benefits (P7)

- `/benefits`, `/benefits/types`, `/benefits/policies`, `/benefits/employee`, `/benefits/reports`
- CSV: `/api/benefits/reports/{types,assignments}`

### Claims (P7)

- `/claims`, `/claims/new`, `/claims/pending`, `/claims/approvals`, `/claims/approved`, `/claims/history`, `/claims/policies`, `/claims/reports`, `/claims/[id]`
- CSV: `/api/claims/reports/{claims,pending,approved,policies}`

### Loans (P8)

- `/loans`, `/loans/types`, `/loans/applications`, `/loans/applications/new`, `/loans/applications/[id]`, `/loans/active`, `/loans/accounts/[id]`, `/loans/repayments`, `/loans/history`, `/loans/settings`
- CSV: `/api/loans/reports/{register,active,outstanding,schedule,repayments,advances,overdue,statement}`

### Payroll (P9 + P10 overlay)

- `/payroll`, `/payroll/runs`, `/payroll/runs/[id]`, `/payroll/review`, `/payroll/review/[runId]/[employeeId]`, `/payroll/exceptions`, `/payroll/employees`, `/payroll/payslips`, `/payroll/payslips/[id]`, `/payroll/reports`, `/payroll/settings`
- CSV: `/api/payroll/reports/{register,sheet,employee,earnings,deductions,approval,bank,payslips}`
- PDF: `/api/payroll/payslips/[id]/pdf`

### Compliance (P9)

- `/compliance`, `/compliance/pf`, `/compliance/esi`, `/compliance/pt`, `/compliance/tds`
- CSV: `/api/compliance/reports/{pf,esi,pt,tds}`

### Exits (P12)

- `/employees/exits`, `/employees/exits/new`, `/employees/exits/[id]`, `/employees/exits/clearance`, `/employees/exits/reports`
- CSV: `/api/exits/reports/{register,notice,clearance}`

### Settlements (P12)

- `/settlements`, `/settlements/new`, `/settlements/[id]`, `/settlements/reports`
- CSV: `/api/settlements/reports/{register,pending,paid}`
- PDF: `/api/settlements/[id]/pdf` (FINALIZED / PARTIALLY_PAID / PAID only)

### Contractors (P12)

- `/contractors`, `/contractors/new`, `/contractors/[id]`, `/contractors/engagements`, `/contractors/reports`
- `/contractor-payments`, `/contractor-payments/new`, `/contractor-payments/[id]`, `/contractor-payments/approvals`
- CSV: `/api/contractors/reports/{register,engagements,invoices,withholding}`

### Reports (P14)

- `/reports`, `/reports/[key]`
- CSV: `/api/reports/[key]`

### Accounting (P14)

- `/accounting`, `/accounting/mappings`, `/accounting/journals`, `/accounting/[id]`, `/accounting/exports`
- CSV: `/api/accounting/journals/[id]/csv`

### Payments (P14)

- `/payments`, `/payments/new`, `/payments/[id]`, `/payments/history`, `/payments/settings`
- CSV: `/api/payments/[id]/csv`

### Notifications and automation (P15)

- `/notifications`
- `/settings/notifications`, `/settings/notifications/templates`
- `/automation`, `/automation/rules`, `/automation/jobs`
- `/settings/developers`, `/settings/developers/webhooks`, `/settings/developers/webhook-logs`, `/settings/developers/api-keys`, `/settings/developers/api-logs`, `/settings/developers/docs`
- `GET /api/v1/{employees,organization,attendance/summaries,leave,payroll/runs,payslips}`
- `POST|GET /api/internal/jobs`

### Employee profile tabs

Overview, employment, statutory, bank, documents, history, attendance (later P4 copy), leave, salary, benefits, claims, loans, payroll.

---

## Database

Apply `supabase/combined.sql` for a fresh project (contains P1+P2+P3+P5+P6+P7+P8+P9+P10+P11+P12+P13+P14+P15). Incremental: `schema.sql`, `phase2.sql`, `phase3.sql`, `phase5.sql`, `phase6.sql`, `phase7.sql`, `phase8.sql`, `phase9.sql`, `phase10.sql`, `phase11.sql`, `phase12.sql`, `phase13.sql`, `phase14.sql`, `phase15.sql`. `seed.sql` is non-production. **No `phase4.sql`.** Header is Phase 1+2+3+5+6+7+8+9+10+11+12+13+14+15.

All listed public tables have RLS enabled. Helpers: `current_profile_id()`, `current_org_ids()`, `has_org_permission()`, `set_updated_at()`.

**P1:** `organizations`, `user_profiles`, `roles`, `permissions`, `role_permissions`, `branches`, `departments`, `designations`, `organization_users`, `audit_logs`, `login_attempts`, `username_lookup`

**P2:** `locations`, `employment_types`, `employees`, `employee_addresses`, `employee_employment`, `employee_statutory`, `employee_bank_accounts`, `employee_documents`, `employee_history` + storage bucket `employee-documents`

**P3:** `biometric_devices`, `biometric_identity_maps`, `biometric_raw_events`, `biometric_normalized_events`, `attendance_punches`

**P5:** `leave_types`, `leave_policies`, `leave_policy_assignments`, `leave_balances`, `leave_balance_transactions`, `leave_requests`, `leave_request_days`, `leave_approvals`, `holidays`, `comp_off_earnings`, `comp_off_transactions`, `attendance_days`

**P6:** `salary_components`, `salary_structures`, `salary_structure_items`, `employee_salary_assignments`, `salary_revisions`, `salary_history`, `variable_earnings`, `reimbursement_entries`

**P7:** `benefit_types`, `benefit_policies`, `employee_benefits`, `claim_types`, `claim_policies`, `claims`, `claim_items`, `claim_approvals`, `claim_policy_checks`, `claim_attachments` + storage bucket `claim-receipts`

**P8:** `loan_types`, `loan_policies`, `loan_applications`, `loan_accounts`, `loan_schedule`, `loan_repayments`, `loan_adjustments`, `loan_approvals`, `loan_ledger`

**P9:** `statutory_rules`, `payroll_runs`, `payroll_items`, `payroll_lines`, `payslips`, `compliance_filings`

**P10:** `payroll_exceptions`, `payroll_approval_history`, `payroll_snapshots`, `payroll_finalization_logs`, `payroll_adjustments`, `payslip_line_items`, `payslip_sequences` + storage bucket `payslips`

**P11:** `statutory_rule_versions`, `org_statutory_settings`, tax declarations/items/proofs, `payroll_statutory_results` / `lines` + storage bucket `tax-proofs`

**P12:** `exit_clearance_items`, `employee_exits`, `exit_clearance_tasks`, `final_settlements`, `settlement_line_items`, `settlement_approvals`, `settlement_payments`, `contractors`, `contractor_engagements`, `contractor_invoices`, `contractor_payment_items`, `contractor_payment_records` + storage bucket `settlement-statements`

**P13:** `ess_notifications`, `ess_change_requests`

**P14:** `accounting_accounts`, `payroll_account_mappings`, `payroll_journals`, `payroll_journal_lines`, `accounting_exports`, `payment_settings`, `payment_batches`, `payment_batch_items`, `payment_transactions`, `payment_reconciliations`, `report_export_jobs` + storage bucket `payment-exports`

**P15:** `ess_notifications` extended (`event_type`, `delivery_status`); `notification_preferences`, `notification_templates`, `notification_deliveries`, `domain_events`, `event_outbox`, `automation_rules`, `automation_rule_runs`, `scheduled_jobs`, `job_executions`, `webhook_endpoints`, `webhook_deliveries`, `api_keys`, `api_request_logs`

**Not present:** shifts, attendance rules, overtime, LOP calc from punches.

`login_attempts` and `username_lookup` are service-role only. Biometric raw insert from the client is denied; ingest uses admin/demo store.

---

## APIs / Services

Server actions in `actions/{auth,setup,users,org,employees,biometric,leave,salary,claims,loans,exits,ess,accounting,payments,reports,notifications,automation,developers}.ts`.

| Area | Code |
|---|---|
| Session / RBAC | `lib/auth/session.ts`, `lib/auth/guards.ts` |
| Audit | `lib/audit.ts` (free-form action strings) |
| Demo twin | `lib/demo-store.ts` — recreates if `employees`, `biometricDevices`, `leaveTypes`, `salaryComponents`, `benefitTypes`, `loanTypes`, `statutoryRules`, `payrollExceptions`, `statutoryRuleVersions`, `employeeExits`, `accountingAccounts` or `domainEvents` missing |
| Biometric | `lib/biometric/{gateway,repository,query,hash,time}.ts`, `lib/biometric/adapters/{essl,generic,index,types}.ts` |
| Leave | `lib/leave/{engine,service,repository,query,csv,dates,attendance}.ts` |
| Salary | `lib/salary/{formula,engine,service,repository,query,csv}.ts` |
| Benefits/Claims | `lib/claims/{engine,service,repository,query,csv}.ts`, `lib/validations/benefits.ts` |
| Loans | `lib/loans/{engine,service,repository,query,csv}.ts`, `lib/validations/loans.ts` |
| Payroll | `lib/payroll/{engine,service,repository,query,csv,workflow,exceptions,numbering,pdf}.ts`, `lib/validations/payroll.ts` |
| Exits / F&F / contractors | `lib/exits/{engine,service,settlement,contractors,repository,query,csv,pdf}.ts`, `lib/validations/exits.ts` |
| Reports / accounting / payments | `lib/reports/{catalog,query,csv}.ts`, `lib/accounting/{repository,service,query,csv}.ts`, `lib/payments/{repository,service,query,columns}.ts` |
| Events / notifications / automation | `lib/events/{bus,catalog,emit,repository}.ts`, `lib/notifications/{service,email,recipients}.ts`, `lib/automation/{rules}.ts`, `lib/jobs/{service}.ts`, `lib/webhooks/{*}`, `lib/api/{http,query}.ts` |
| Proxy | `proxy.ts` — public prefixes for login/reset, biometric ingest, `/api/v1` and `/api/internal/jobs` |

Payroll consumes: `getEmployeeSalaryForDate` (`lib/salary/service.ts`); `getApprovedPayrollClaimLines` (`lib/claims/service.ts`); `getEmployeeLoanDeductions` / `recordLoanRepayment` (`lib/loans/service.ts`); leave-written `attendance_days`; `employeeExcludedFromOrdinaryPayroll` (`lib/exits/service.ts`).

---

## Biometric

- Vendors in code: `ESSL`, `GENERIC`. Registry tries preferred vendor then fallback.
- Connection modes: PUSH, WEBHOOK, SIMULATOR.
- Ingest: token from `x-device-token` / `x-essl-token` / Bearer / query. Token stored as SHA-256 only.
- Flow: raw event -> adapter parse -> normalized event -> identity map -> `attendance_punches`. Dedupes. Unmapped punches stay UNMAPPED.
- UI: devices, mapping, punches, live (poll), logs, simulator.
- Not implemented: Face, QR, GPS, mobile attendance, vendor-specific pull sync, attendance day calculation from punches.

---

## Attendance

**Not implemented as a module.** Nav disabled. No calculation of PRESENT/ABSENT/late/OT from punches.

What exists:

- `attendance_punches` from Phase 3 ingest.
- `attendance_days` from Phase 5: leave approval writes `PAID_LEAVE` / `UNPAID_LEAVE` / `HALF_DAY_LEAVE` / `COMP_OFF` with `source=LEAVE`. Cancel restores `previous_status`. Demo seed has one `HOLIDAY` row.
- Status enum also includes PRESENT, ABSENT, WEEKLY_OFF — unused by a calculation engine.
- Salary `loadAttendanceInputs` reads `attendance_days` and leave requests; `lateCount` and `otMinutes` are always `0`.

---

## Leave

Configurable types/policies (CL/SL/EL/LOP/COMP are demo seeds). Weekly-off from org `weekly_off`. Holidays never become ABSENT. Half-day first/second. Overlapping PENDING/APPROVED blocked. Balances via ledger (`ALLOCATED`, `ACCRUED`, `USED`, `PENDING`, `CANCELLED`, `ADJUSTMENT`, `COMP_OFF_*`). Comp-off earnings/transactions. CSV reports.

---

## Salary

Configurable components/structures. Methods: FIXED, PERCENTAGE, FORMULA, MANUAL, RESIDUAL. Parser tokens: `BASIC|HRA|DA|TA|GROSS|CTC|WORKING_DAYS|PRESENT_DAYS|LOP_DAYS|OT_HOURS` plus component codes; operators `+ - * / ( )` only.

- Overlapping ACTIVE assignments blocked.
- Revision approval closes previous period the day before `effective_from` and writes `salary_history`.
- Variable earnings and reimbursements stored; payroll includes APPROVED rows overlapping the period.
- Permissions: `salary.view`, `salary.manage`, `salary.component.manage`, `salary.structure.manage`, `salary.revision.create`, `salary.revision.approve`, `salary.history.view`. HR all; PAYROLL view/manage/revision.create/history; ACCOUNTANT view/history; EMPLOYEE none.

Demo seed: BASIC 40% CTC, HRA `BASIC * 0.40`, DA 10% Basic, TA ₹1600, SPECIAL residual. Asha closed then active increment; Meera active Staff CTC; Rahul pending NEW_JOINER.

---

## Benefits and claims

Configurable benefit types (FIXED / PERCENTAGE / MANUAL) and scoped policies. Employee assignments block overlapping ACTIVE periods; a later start closes the previous period the day before.

Claim types and travel policies. Workflow: DRAFT -> SUBMITTED -> APPROVED / REJECTED / CORRECTION, optional TWO_STEP (MANAGER then FINANCE). Policy engine (`validateClaim`) runs on submit. FAIL blocks submit; draft and checks are saved. TA/DA = distance x rate + days x DA.

Permissions: `benefits.view|manage|assign`; `claims.view|create|edit|approve|manage|export`. Benefit CSV needs `benefits.view`; claim CSV needs `claims.view` or `claims.export`. HR all; PAYROLL view/export/approve; ACCOUNTANT view; MANAGER view/approve; EMPLOYEE view/create.

Demo seed: four benefit types, three assignments, four claim types/policies, approved fuel claim, pending outstation claim, draft medical claim.

`getApprovedPayrollClaimLines` returns APPROVED + `include_in_payroll` lines. Payroll process marks `INCLUDED_IN_PAYROLL`; mark-paid sets `PAID`.

---

## Loans

Configurable loan types (salary advance, employee loan, emergency, festival) with NONE / FLAT / REDUCING interest. Scoped policies. Workflow: DRAFT → SUBMITTED → (TWO_STEP: MANAGER then FINANCE) → APPROVED → DISBURSED account + schedule + DISBURSEMENT ledger.

Zero-interest EMI = principal / tenure; reducing uses the EMI formula. Salary advance is a loan type with a full recovery schedule, not a single balance field. Ledger is append-only.

Permissions: `loans.view|create|edit|approve|disburse|repayment.manage|adjust|export|settings`. HR all; PAYROLL view/disburse/repayment/export; ACCOUNTANT view/approve/disburse/repayment/export; MANAGER view/create/approve; EMPLOYEE view/create.

Demo seed: Asha ₹20k salary advance (4×₹5k, 1 paid); Meera pending reducing loan; Rahul festival draft.

`getEmployeeLoanDeductions(orgId, employeeId, payrollPeriod)` returns EMI due for ACTIVE auto-deduct accounts. Payroll process posts repayments with `source: "PAYROLL"`.

---

## Payroll

Monthly run overlay: DRAFT → CALCULATED → UNDER_REVIEW → APPROVAL_PENDING → APPROVED → FINALIZED → LOCKED → PROCESSED → PAID (CANCELLED added). Recalculate only DRAFT/CALCULATED. ERROR exceptions block review/approval; WARNING must be acknowledged. Finalize writes an immutable snapshot. Unlock is blocked after finalize. Process posts loan EMI and marks claims; generates numbered PDFs if none exist.

Payslip numbers are `PREFIX/FY/MON/000001`. Payslips show PF/ESI/PT/TDS/LWF employee deductions; employer contributions are not deducted from net. Adjustments require a reason; processed/paid cannot be adjusted in place.

Statutory: versioned `statutory_rule_versions` when ACTIVE, else Phase 9 `statutory_rules` with a warning. Attendance: leave-written days; unmarked working days count as paid until Phase 4.

Permissions: `payroll.view|process|lock|review|approve|reject|finalize|adjust|payslip.view|export|settings`, `payslip.generate|export`, `compliance.view|export|manage|rules.manage|tax.manage|proofs.review`. HR all four compliance manage; ACCOUNTANT tax+proofs; PAYROLL view/export only.

Demo seed: PF 12%/12% ceiling 15000, ESI 0.75%/3.25% max 21000, Karnataka PT slabs, TDS/LWF org default off. Versioned templates exist as DISABLED/unverified. No pre-calculated run.

---

## Exits, settlements and contractors

Employee exits: DRAFT → SUBMITTED → APPROVED → IN_NOTICE / CLEARANCE_PENDING → SETTLEMENT_PENDING → SETTLED (CANCELLED). Cancel restores employee `ACTIVE`. Required clearance (HR/FINANCE/IT/MANAGER templates) must complete before settlement; optional ADMIN template does not block. Default templates seed if the org has none.

F&F: DRAFT → CALCULATED / HAS_EXCEPTIONS → UNDER_REVIEW → APPROVED → FINALIZED → PARTIALLY_PAID / PAID (CANCELLED). Calc uses `getEmployeeSalaryForDate` on LWD, leave-written attendance through LWD, approved variables/reimbursements/claims, leave types with `encashment_allowed` × daily basic, notice shortfall recovery or termination extra notice pay, outstanding loan principal+interest, and `calculateStatutoryBreakdown`. `loadStatutory` is local in `lib/exits/settlement.ts`. Finalized rows are not silently edited. PDF after FINALIZED/PARTIALLY_PAID/PAID. Full payment calls `markExitSettled` and posts `recordLoanRepayment` (`source: "PAYROLL"`).

Ordinary payroll: `calculatePayrollRun` skips employees via `employeeExcludedFromOrdinaryPayroll` when a non-draft/submitted/cancelled exit has `last_working_date` before `period_from`. `eligibleEmployee` still requires `status === "ACTIVE"`.

Contractors are not employees. Invoice workflow: DRAFT → SUBMITTED → APPROVED / REJECTED → PARTIALLY_PAID / PAID (CANCELLED). Duplicate invoice numbers need `duplicateOverrideReason`. Withholding uses Phase 11 verified TDS versions; missing/unverified rules block calculation.

Permissions: `exits.view|create|edit|approve|cancel|export`, `clearance.view|manage`, `settlements.view|calculate|review|approve|finalize|pay|adjust|export`, `contractors.view|manage|engagements.manage|invoices.create|invoices.approve|pay|withholding.manage|export`. HR all; PAYROLL view/export/calculate; ACCOUNTANT settlements review/approve/finalize/pay plus contractor invoices; MANAGER exits approve + clearance; EMPLOYEE none.

Demo seed: five clearance templates; no exits, settlements or contractors.

---

## Employee self-service (ESS)

Identity is resolved server-side (`lib/ess/identity.ts`) from the session user's `employees.user_id`. A browser-supplied employee id is never trusted for authorisation. Users without a linked employee see an explicit setup state and no other employee data. RLS adds `public.current_employee_ids()`; `ess_change_requests` is readable by the current employee or an authorized reviewer.

Routes under `/my` reuse existing services: leave (`loadEmployeeLeave`), claims, loans, payslips, salary snapshot, attendance days, documents, holidays and Phase 11 tax declarations. No second attendance or approval engine.

Profile change requests (`ess_change_requests`): DRAFT-free PENDING → APPROVED / REJECTED / CANCELLED. Categories CONTACT, ADDRESS, EMERGENCY, BANK, STATUTORY, EDUCATION, OTHER. BANK and STATUTORY are sensitive and are never auto-applied: approval records the decision and notifies the employee; HR applies the value through the employee master.

Sensitive display is masked: account number, PAN, Aadhaar last 4, UAN and ESIC. Employee documents and tax proofs use short-lived signed URLs re-checked against the signed-in employee's own record. Payslips use `/api/payroll/payslips/[id]/pdf`. No public document URLs.

ESS inbox still uses `ess_notifications`. Phase 15 extends those rows with `event_type` and `delivery_status`. Email is optional SMTP only; WhatsApp/SMS are not implemented. Manager `/my/team` is limited to direct reports via `reporting_manager_id` and links to the existing leave/claims/loans approval screens.

Permissions: `self.view`, `self.profile.update`, `self.change_request.review`, `self.notifications.manage`. HR gets all four; PAYROLL gets view/update/notifications; ACCOUNTANT and MANAGER get view/update; EMPLOYEE gets view/update.

Demo seed: one pending bank change request for Rahul, plus notifications for Rahul and HR.

Explicitly not implemented: QR, GPS, face recognition, smart auto attendance, raw punch editing, leave-balance bypass.

---

## Reports, accounting and payments (P14)

Reports hub at `/reports` runs stored-data queries (`lib/reports/query.ts`). Payroll totals come from payroll runs/items/lines, not a second engine. Phase 4 late/early/OT/present-absent reports return an explicit “not calculated” table.

Accounting journals consume the finalized payroll snapshot (`payload_json` = `{ run, items, lines, exceptions, totals }`). Live rows are fallback only if snapshot JSON cannot be parsed. Unmapped components block export. Debit must equal credit. One non-VOID journal per run. Duplicate export requires explicit confirmation. Generic journal CSV only — no Tally/Zoho API.

Payment batches from finalized/approved runs only. Bank-file export is an instruction, not proof of payment (`EXPORTED` ≠ paid). Invalid bank details surface as employee-level errors. Authorized exclusion requires a reason and never changes finalized net salary. Bank details are masked in UI; files are generated server-side. Configurable generic CSV column mapping (`lib/payments/columns.ts`). Outcomes append `payment_transactions`; item status is latest, history is not overwritten. Reconciliation previews MATCHED/UNMATCHED/DUPLICATE/AMOUNT_MISMATCH then confirms MATCHED rows only.

Permissions: `reports.view|export`, `accounting.manage`, `accounting.journal.view|export`, `payments.view|create|approve|export|reconcile`. HR reports; PAYROLL reports + journal.view + payments view/create/export; ACCOUNTANT full accounting+payments; MANAGER `reports.view`.

Demo seed: ledger accounts and mappings (including employer PF/ESI/LWF debit+credit), payment settings, finalized run `run-demo-finalized` / snapshot `snapshot-demo-finalized` (Asha+Meera included).

---

## Automation, notifications, APIs and webhooks (P15)

Durable domain events (`domain_events` + `event_outbox`) are emitted via `emitSafe` from leave, payroll, claims, loans, employees, exits, contractors, payments and biometric ingest. `processOutbox` fans out notifications, rules and webhooks. No in-request timers.

In-app notifications default from `defaultNotificationPlan`. Email is queued only when the user preference has `email=true` and SMTP is configured (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`/`MAIL_FROM`). Recipient address is `employee_employment.official_email` (`UserProfile` has no email). Unconfigured or failed SMTP is recorded as UNCONFIGURED/FAILED — never as success. WhatsApp and SMS are not implemented.

Automation rules use predefined triggers/conditions/actions only. No arbitrary SQL or user code. Rules cannot auto-create or finalize payroll without an authorized policy. Sensitive mutations go through existing business services.

Scheduled jobs are claimed uniquely on `(job_id, scheduled_for)` with locking. Loan reminders filter `DUE`/`OVERDUE` only. Worker: `POST /api/internal/jobs` with `JOBS_WORKER_SECRET`.

Webhooks: HMAC + timestamp + event id, secret rotation, retry/backoff, HTTPS in production, SSRF block of localhost/private/metadata. Payloads never include passwords, tokens, full bank numbers or Aadhaar.

API keys: prefix `bsb_live_`, sha256 hashed, org-scoped, granular scopes `employees|organization|attendance|leave|payroll|payslips.read`, expiry/revoke/rotate, rate limited, request IDs. Plaintext shown only at create. Keys cannot bypass RLS, approvals or finalized payroll. Attendance summaries do not claim Phase 4 punch calculation.

Permissions: `notifications.view|manage`, `automation.view|manage`, `automation.jobs.view|retry`, `developers.view`, `developers.webhooks.manage|replay`, `developers.api_keys.manage`, `developers.logs.view`. HR gets notification/automation manage + job retry. PAYROLL view jobs. ACCOUNTANT/MANAGER/EMPLOYEE get `notifications.view` only. Developer screens are ADMIN/SUPER_ADMIN.

Demo seed: `createAutomationSeed()` — templates, one leave-approval rule, daily loan-reminder job.

---

## Known Issues

- `app/(app)/coming-soon.tsx` is unused; disabled nav items are non-links with a Soon badge.
- Roles UI is read-only; custom role editing not built.
- Employee CSV import only (Excel rejected).
- Salary OT/late inputs stubbed; proration not finalized.
- No `/attendance` route; hitting it 404s.
- Tax treatment on benefits is stored as a placeholder only.
- Unmarked working days count as paid in payroll until Phase 4 produces PRESENT/ABSENT.
- Seed statutory versions are DISABLED/unverified; official rates were not independently verified in this environment.
- Contractor withholding is blocked until a verified TDS rule version exists for the invoice date.

---

## Current Phase

**Next: Phase 16 — AI & Advanced Analytics (not started).**

Phase 15 automation/notifications/APIs overlay is complete. Phase 4 attendance remains the main accuracy gap: day totals still come from leave-written `attendance_days` plus unmarked working days treated as paid. Do not start Phase 4 unless requested.

---

## Next Dependencies

Phase 16 should consume, not rebuild:

- Stored payroll, leave, claims, loans and report queries
- Domain events and notification deliveries
- Existing RBAC and audit

Phase 4 should consume, not rebuild:

- Employees, org timezone, `weekly_off`, branches/locations (P1–P2)
- `attendance_punches` and identity maps (P3)
- `holidays`, leave-written `attendance_days`, leave request days (P5)
- Salary already reads `attendance_days` via `loadAttendanceInputs` / formula tokens `WORKING_DAYS`, `PRESENT_DAYS`, `LOP_DAYS`
- Phase 7 `getApprovedPayrollClaimLines` is consumed by payroll
- Phase 8 `getEmployeeLoanDeductions` is consumed by payroll
- Phase 9 payroll reads `attendance_days` and treats unmarked working days as paid
- Phase 12 F&F also prorates through LWD using the same attendance summary

Phase 4 must fill PRESENT/ABSENT/WEEKLY_OFF/HOLIDAY (and later late/OT) without erasing leave marks or punch history.

---

## Demo

Logins: `bsbadmin`/`Admin@123`, `bsbhr`/`Hruser@123`, `bsbpayroll`/`Payroll@123`, `bsbemployee`/`Employee@123`. ESS demo: `bsbemployee` (Rahul, linked) sees own data; `bsbpayroll` has no linked employee and shows the ESS setup state.

Org `11111111-1111-1111-1111-111111111111`. Employees BSB-1001 Asha Rao, BSB-1002 Meera Iyer, BSB-1003 Rahul Sharma. eSSL token `demo-essl-ho-token`.

---

## Update rule

After each phase, update this file, `docs/BSB_PAYROLL_ARCHITECTURE.md`, and `docs/BSB_PAYROLL_CHANGELOG.md`. Record actual code only.
