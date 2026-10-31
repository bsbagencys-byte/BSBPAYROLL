# Staging

Staging is a separate environment. It must not share production database, storage, device tokens, or billing webhooks.

## Required separation

- Distinct `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Distinct `NEXT_PUBLIC_APP_URL` and optional `NEXT_PUBLIC_STAGING_APP_URL`.
- Distinct `JOBS_WORKER_SECRET`, `SESSION_SECRET`, SMTP credentials, Razorpay webhook secret, and biometric device tokens.
- `NEXT_PUBLIC_DEMO_MODE=false` only when a real staging Supabase project is configured.
- Do not run `seed.sql` against staging if it contains demo passwords you would not give a customer.

## Services

1. Frontend: same Next.js app, staging origin, HTTPS.
2. Database: staging Supabase project. Apply `supabase/combined.sql` on an empty project, or incremental `phase17.sql` through `phase20.sql` on an existing overlay.
3. Storage buckets: `employee-documents`, `claim-receipts`, `payslips`, `tax-proofs`, `settlement-statements`, `payment-exports`.
4. Worker: `POST /api/internal/jobs` with the staging worker secret.
5. Email: staging SMTP or leave unconfigured (deliveries stay UNCONFIGURED, never fake success).
6. Billing webhook: staging-only URL. Production Razorpay events must not hit staging.
7. Biometric gateway: staging device tokens only. Production punches must not ingest here.

## Safety

- Staging cannot modify production payroll or customer rows because it uses a different database.
- Do not copy production service-role keys into staging env files committed to git.
- Do not finalize or pay a staging/pilot payroll as if it were live salary.

## Health

`GET /api/health` must return `ok: true` without secrets. `limitations.attendanceCalculation` remains false until Phase 4 exists.
