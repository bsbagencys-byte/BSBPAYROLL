# Deploy

## Build

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Framework: Next.js. Start command: `npm start`. Node `>=20`.

## Environment

Copy `.env.example`. Production must set:

- `NEXT_PUBLIC_DEMO_MODE=false`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL` (https origin)
- `SESSION_SECRET` (long random; used for webhook secret encryption)
- `JOBS_WORKER_SECRET`
- Optional SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` or `MAIL_FROM`

Never prefix the service-role key with `NEXT_PUBLIC_`.

## Database

Fresh project: `supabase/combined.sql`. Incremental overlay: `supabase/phase17.sql`. Do not run `seed.sql` in production.

## Worker

Schedule `POST /api/internal/jobs` with `Authorization: Bearer $JOBS_WORKER_SECRET` at least every 5 minutes. Empty secret disables the endpoint.

## Health

- `GET /api/health` — liveness plus configuration flags (no secrets).
- `GET /api/health/live` — process up.

## Rollback

Redeploy the previous successful build. Do not DROP Phase 17 columns. Payroll that is FINALIZED/LOCKED/PROCESSED/PAID stays immutable.
