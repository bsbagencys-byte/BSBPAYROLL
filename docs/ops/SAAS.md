# SaaS operations

## Tenancy

Each customer is an `organizations` row. Business data is org-scoped. Login is blocked when `organizations.status = SUSPENDED`. Membership `DISABLED` also blocks access.

## Provisioning

1. Create the organization (setup wizard or admin insert).
2. Create the first ADMIN/SUPER_ADMIN user.
3. Complete setup before app routes.
4. Do not seed demo employees or demo passwords.

## Billing

No billing provider is wired. Do not invent invoices, trials, or card charges. Commercial terms are outside this codebase.

## Support access

Support must not impersonate by rewriting `employees.user_id` or using a service-role key in a browser. Use a dedicated support membership with least privilege if required.

## Data retention

Suspend does not delete. Exports use existing CSV/PDF routes. Right-to-erasure is a legal process, not an automatic job.
