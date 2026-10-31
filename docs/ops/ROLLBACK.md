# Rollback

1. Stop sending traffic to the new deploy. Restore the previous successful build on the platform.
2. Do not reverse `combined.sql` or `phase17.sql`–`phase20.sql` with DROP. Overlays are additive and preserve tenant data.
3. Leave payroll runs that reached FINALIZED, LOCKED, PROCESSED or PAID untouched. Corrections are adjustment or reversal runs only.
4. Rotate `JOBS_WORKER_SECRET`, API keys, webhook secrets and device tokens if they leaked.
5. Confirm `GET /api/health` and a known payroll snapshot count after restore.
6. Record the incident in `/admin/launch/incidents` and `docs/ops/INCIDENT.md`.

Never include service-role keys, SMTP passwords, or complete bank details in the incident record.
