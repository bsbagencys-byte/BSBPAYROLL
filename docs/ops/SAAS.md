# SaaS operations

## Tenancy

Each customer is an `organizations` row. Business data is org-scoped. Login is blocked when `organizations.status = SUSPENDED`. Membership `DISABLED` also blocks access.

## Provisioning

1. Create the organization (setup wizard or admin insert).
2. Create the first ADMIN/SUPER_ADMIN user.
3. Complete setup before app routes.
4. Do not seed demo employees or demo passwords.
5. Optionally assign a subscription plan from `/admin/subscriptions`. Limits are not enforced until a plan is selected.

## Billing

Subscription billing is implemented as a Phase 18 overlay and is separate from employee salary payment batches.

- Plans are configurable. Demo Trial/Starter/Professional/Enterprise rows are examples, not hard-coded commercial packages.
- Historical prices and issued invoices are snapshots. Editing a plan does not rewrite them.
- Lifecycle: TRIAL, ACTIVE, PAST_DUE, GRACE_PERIOD, SUSPENDED, CANCELLED, EXPIRED.
- Entitlements are enforced in backend create workflows. Hitting a limit does not delete or mutate existing records.
- Invoices use `{prefix}-{year}-{seq}`. GST is not assumed. Incomplete tax config is flagged on the invoice.
- Payment provider is optional. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only when using Razorpay.
- An unconfigured provider cannot mark an invoice PAID or a subscription ACTIVE from a browser success callback.
- Webhooks at `POST /api/billing/webhook` verify signatures and are idempotent.
- Do not store card numbers or provider credentials in the database.

## Support access

Support must not impersonate by rewriting `employees.user_id` or using a service-role key in a browser. Use a dedicated support membership with least privilege if required.

Platform-only actions (`plans.manage`, `subscription.override`, `billing.invoice.manage`, `billing.refund.manage`) are SUPER_ADMIN.

## Data retention

Suspend does not delete. Restricted subscriptions still allow billing, usage, invoices, and profile. Exports use existing CSV/PDF routes. Right-to-erasure is a legal process, not an automatic job.
