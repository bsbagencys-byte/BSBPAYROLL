# Backup and restore

## What to back up

- PostgreSQL (Supabase): all public schema tables. Prefer daily automated backups plus point-in-time recovery.
- Storage buckets: `employee-documents`, `claim-receipts`, `payslips`, `tax-proofs`, `settlement-statements`, `payment-exports`.
- Secrets: platform env only. Never copy service-role keys, SMTP passwords, `JOBS_WORKER_SECRET`, or `SESSION_SECRET` into the repo or client bundles.

## Restore

1. Restore the database to a new project or a recovery slot. Do not overwrite a live project until payroll operations confirm there are no in-flight FINALIZED runs that would be lost.
2. Restore storage buckets.
3. Re-enter environment variables. Do not reuse demo mode.
4. Run `supabase/combined.sql` only on an empty database. On an existing restore, skip schema apply.
5. Hit `GET /api/health` and sign in with a non-demo admin.

## Tenant suspend vs delete

Organization `status=SUSPENDED` blocks login. Subscription status `SUSPENDED` / `CANCELLED` / `EXPIRED` restricts new entitlements but does not delete tenant rows. Deletion is a separate, authorized legal process and is not implemented as a product action.
