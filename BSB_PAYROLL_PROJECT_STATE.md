# BSB Payroll — Project State

Before implementing any future BSB Payroll phase, read this file first. Do not rediscover or rewrite completed architecture. Implement only the current requested delta and update this file afterward.

---

## Project

- **Product:** BSB Payroll
- **Repo:** `bsbagencys-byte/BSBPAYROLL`, branch `main` (Phase 8 uncommitted)
- **Stack:** Next.js 16.3.6 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, Zod 4, Supabase Auth + PostgreSQL + RLS (`@supabase/ssr`, `@supabase/supabase-js`). Node `>=20`.
- **Runtime modes:** Demo in-memory store when unconfigured or `NEXT_PUBLIC_DEMO_MODE=true`. Production: real Supabase, `NEXT_PUBLIC_DEMO_MODE=false`. Service-role key is server-only.
- **Status:** Phases 1, 2, 3, 5, 6, 7, 8 implemented. Phase 4 Attendance is not started. Payroll / compliance / global reports are not started.

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
| 6 Salary & Compensation | **COMPLETE** for master CTC; **PARTIAL** for payroll inputs | Components, structures, assignments, revisions, history, formula parser, variable/reimbursement storage. No payroll run, PF/ESI/TDS, payslips. `lateCount` / `otMinutes` stubbed at `0`. |
| 7 Benefits, Reimbursements, TA/DA & Claims | **COMPLETE** for master data and workflow; **PARTIAL** for payroll | Types, policies, assignments, claims, approvals, policy engine, TA/DA calc, receipts, CSV. `getApprovedPayrollClaimLines` exists. No payroll run, PAID, or statutory tax. |
| 8 Loans & Advances | **COMPLETE** for master data and recovery; **PARTIAL** for payroll | Types, policies, applications, accounts, EMI schedule, ledger, repayments, adjustments. `getEmployeeLoanDeductions` exists. No payroll run or statutory tax. |

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
- Mutations are server actions; public HTTP APIs are biometric ingest plus CSV downloads.
- Salary is effective-date based and auditable; previous CTC is never overwritten.
- Formula engine is a controlled parser, not `eval`.
- Attendance and leave are read-only inputs to salary; salary never writes those tables.

---

## Current Modules

Enabled nav: Dashboard, Employees, Leave, Salary, Benefits, Claims, Loans, Biometric, Settings.

Disabled nav (no pages): `/attendance` (P4), `/payroll` (P9), `/reports` (P10), `/compliance` (P9).

### Auth / foundation

- `/login`, `/forgot-password`, `/reset-password`, `/unauthorized`, `/setup`, `/dashboard`, `/profile`

### Settings

- `/settings/company`, `/branches`, `/departments`, `/designations`, `/locations`, `/employment-types`, `/users`, `/roles`, `/security`

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

### Employee profile tabs

Overview, employment, statutory, bank, documents, history, attendance (later P4 copy), leave, salary, benefits, claims, loans, payroll (later P9 copy).

---

## Database

Apply `supabase/combined.sql` for a fresh project (contains P1+P2+P3+P5+P6+P7+P8). Incremental: `schema.sql`, `phase2.sql`, `phase3.sql`, `phase5.sql`, `phase6.sql`, `phase7.sql`, `phase8.sql`. `seed.sql` is non-production. **No `phase4.sql`.** Header is Phase 1+2+3+5+6+7+8.

All listed public tables have RLS enabled. Helpers: `current_profile_id()`, `current_org_ids()`, `has_org_permission()`, `set_updated_at()`.

**P1:** `organizations`, `user_profiles`, `roles`, `permissions`, `role_permissions`, `branches`, `departments`, `designations`, `organization_users`, `audit_logs`, `login_attempts`, `username_lookup`

**P2:** `locations`, `employment_types`, `employees`, `employee_addresses`, `employee_employment`, `employee_statutory`, `employee_bank_accounts`, `employee_documents`, `employee_history` + storage bucket `employee-documents`

**P3:** `biometric_devices`, `biometric_identity_maps`, `biometric_raw_events`, `biometric_normalized_events`, `attendance_punches`

**P5:** `leave_types`, `leave_policies`, `leave_policy_assignments`, `leave_balances`, `leave_balance_transactions`, `leave_requests`, `leave_request_days`, `leave_approvals`, `holidays`, `comp_off_earnings`, `comp_off_transactions`, `attendance_days`

**P6:** `salary_components`, `salary_structures`, `salary_structure_items`, `employee_salary_assignments`, `salary_revisions`, `salary_history`, `variable_earnings`, `reimbursement_entries`

**P7:** `benefit_types`, `benefit_policies`, `employee_benefits`, `claim_types`, `claim_policies`, `claims`, `claim_items`, `claim_approvals`, `claim_policy_checks`, `claim_attachments` + storage bucket `claim-receipts`

**P8:** `loan_types`, `loan_policies`, `loan_applications`, `loan_accounts`, `loan_schedule`, `loan_repayments`, `loan_adjustments`, `loan_approvals`, `loan_ledger`

**Not present:** shifts, attendance rules, overtime, LOP calc, payroll runs, payslips, statutory PF/ESI/TDS tables.

`login_attempts` and `username_lookup` are service-role only. Biometric raw insert from the client is denied; ingest uses admin/demo store.

---

## APIs / Services

Server actions in `actions/{auth,setup,users,org,employees,biometric,leave,salary,claims,loans}.ts`.

| Area | Code |
|---|---|
| Session / RBAC | `lib/auth/session.ts`, `lib/auth/guards.ts` |
| Audit | `lib/audit.ts` (free-form action strings) |
| Demo twin | `lib/demo-store.ts` — recreates if `employees`, `biometricDevices`, `leaveTypes`, `salaryComponents`, `benefitTypes`, or `loanTypes` missing |
| Biometric | `lib/biometric/{gateway,repository,query,hash,time}.ts`, `lib/biometric/adapters/{essl,generic,index,types}.ts` |
| Leave | `lib/leave/{engine,service,repository,query,csv,dates,attendance}.ts` |
| Salary | `lib/salary/{formula,engine,service,repository,query,csv}.ts` |
| Benefits/Claims | `lib/claims/{engine,service,repository,query,csv}.ts`, `lib/validations/benefits.ts` |
| Loans | `lib/loans/{engine,service,repository,query,csv}.ts`, `lib/validations/loans.ts` |
| Proxy | `proxy.ts` — public prefixes for login/reset and biometric ingest |

Future payroll contracts already exist: `getEmployeeSalaryForDate(organizationId, employeeId, date)` in `lib/salary/service.ts`; `getApprovedPayrollClaimLines(organizationId, period)` in `lib/claims/service.ts`; `getEmployeeLoanDeductions(organizationId, employeeId, payrollPeriod)` in `lib/loans/service.ts`.

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
- Variable earnings and reimbursements stored, not processed into a payroll run.
- Permissions: `salary.view`, `salary.manage`, `salary.component.manage`, `salary.structure.manage`, `salary.revision.create`, `salary.revision.approve`, `salary.history.view`. HR all; PAYROLL view/manage/revision.create/history; ACCOUNTANT view/history; EMPLOYEE none.

Demo seed: BASIC 40% CTC, HRA `BASIC * 0.40`, DA 10% Basic, TA ₹1600, SPECIAL residual. Asha closed then active increment; Meera active Staff CTC; Rahul pending NEW_JOINER.

---

## Benefits and claims

Configurable benefit types (FIXED / PERCENTAGE / MANUAL) and scoped policies. Employee assignments block overlapping ACTIVE periods; a later start closes the previous period the day before.

Claim types and travel policies. Workflow: DRAFT -> SUBMITTED -> APPROVED / REJECTED / CORRECTION, optional TWO_STEP (MANAGER then FINANCE). Policy engine (`validateClaim`) runs on submit. FAIL blocks submit; draft and checks are saved. TA/DA = distance x rate + days x DA.

Permissions: `benefits.view|manage|assign`; `claims.view|create|edit|approve|manage|export`. Benefit CSV needs `benefits.view`; claim CSV needs `claims.view` or `claims.export`. HR all; PAYROLL view/export/approve; ACCOUNTANT view; MANAGER view/approve; EMPLOYEE view/create.

Demo seed: four benefit types, three assignments, four claim types/policies, approved fuel claim, pending outstation claim, draft medical claim.

`getApprovedPayrollClaimLines` returns APPROVED + `include_in_payroll` lines. Does not mark PAID or write payroll.

---

## Loans

Configurable loan types (salary advance, employee loan, emergency, festival) with NONE / FLAT / REDUCING interest. Scoped policies. Workflow: DRAFT → SUBMITTED → (TWO_STEP: MANAGER then FINANCE) → APPROVED → DISBURSED account + schedule + DISBURSEMENT ledger.

Zero-interest EMI = principal / tenure; reducing uses the EMI formula. Salary advance is a loan type with a full recovery schedule, not a single balance field. Ledger is append-only.

Permissions: `loans.view|create|edit|approve|disburse|repayment.manage|adjust|export|settings`. HR all; PAYROLL view/disburse/repayment/export; ACCOUNTANT view/approve/disburse/repayment/export; MANAGER view/create/approve; EMPLOYEE view/create.

Demo seed: Asha ₹20k salary advance (4×₹5k, 1 paid); Meera pending reducing loan; Rahul festival draft.

`getEmployeeLoanDeductions(orgId, employeeId, payrollPeriod)` returns EMI due for ACTIVE auto-deduct accounts. Does not write payroll tables.

---

## Known Issues

- `app/(app)/coming-soon.tsx` is unused; disabled nav items are non-links with a Soon badge.
- Roles UI is read-only; custom role editing not built.
- Employee CSV import only (Excel rejected).
- Salary OT/late inputs stubbed; proration not finalized.
- No `/attendance` route; hitting it 404s.
- Tax treatment on benefits is stored as a placeholder only.
- Approved claims are not paid or included in a payroll period from this UI.
- Loan EMI payroll deduction is exposed as a contract only; this UI does not run payroll.

---

## Current Phase

**Next: Phase 9 Payroll.**

Phase 8 loans are complete as master data and recovery. Do not start payroll until attendance days can be produced from punches + leave + holidays + weekly-off (Phase 4 remains a gap). Prefer Phase 4 Attendance before a full payroll run if day totals are required.

---

## Next Dependencies

Phase 4 should consume, not rebuild:

- Employees, org timezone, `weekly_off`, branches/locations (P1–P2)
- `attendance_punches` and identity maps (P3)
- `holidays`, leave-written `attendance_days`, leave request days (P5)
- Salary already reads `attendance_days` via `loadAttendanceInputs` / formula tokens `WORKING_DAYS`, `PRESENT_DAYS`, `LOP_DAYS`
- Phase 7 `getApprovedPayrollClaimLines` is ready for a later payroll run
- Phase 8 `getEmployeeLoanDeductions` is ready for a later payroll run

Phase 4 must fill PRESENT/ABSENT/WEEKLY_OFF/HOLIDAY (and later late/OT) without erasing leave marks or punch history.

---

## Demo

Logins: `bsbadmin`/`Admin@123`, `bsbhr`/`Hruser@123`, `bsbpayroll`/`Payroll@123`, `bsbemployee`/`Employee@123`.

Org `11111111-1111-1111-1111-111111111111`. Employees BSB-1001 Asha Rao, BSB-1002 Meera Iyer, BSB-1003 Rahul Sharma. eSSL token `demo-essl-ho-token`.

---

## Update rule

After each phase, update this file, `docs/BSB_PAYROLL_ARCHITECTURE.md`, and `docs/BSB_PAYROLL_CHANGELOG.md`. Record actual code only.
