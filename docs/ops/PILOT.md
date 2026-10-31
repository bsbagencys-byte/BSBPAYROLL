# Pilot

Controlled pilot for 2-5 isolated organizations. Do not mix records between tenants.

## Suggested tenants

- School (`PILOT-SCHOOL`)
- Hospital/clinic (`PILOT-HOSPITAL`)
- Office/business (`PILOT-OFFICE`)
- Multi-branch (`PILOT-MULTI`)

Each pilot is a separate `organizations` row. Employees, punches, leave, payroll and tickets stay on that `organization_id`.

## Configuration checklist

Required:

1. Company profile and legal identity
2. Branches, departments and locations
3. Users and roles (no demo passwords)
4. Employee master for this organization only
5. Salary structures and assignments
6. Leave types, policies and holidays
7. Statutory configuration with source citation (leave DISABLED if unverified)
8. Non-final parallel payroll comparison for at least two representative periods

Optional / blocked:

- Shifts and attendance rules (Phase 4 not started)
- Physical biometric connection (record SIMULATED or API_TESTED until a device is verified)

## Payroll parallel run

Compare BSB net against independently verified records. Document every mismatch. Do not finalize or pay.

## UAT roles

ADMIN, HR, PAYROLL, EMPLOYEE, ACCOUNTANT. Shift/attendance journeys remain BLOCKED until Phase 4.

## Sign-off

Sign-off covers tested workflows only. It is not a production launch recommendation.
