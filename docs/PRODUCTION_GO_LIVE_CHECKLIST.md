# BSB Payroll — Production go-live checklist

Status from code, not README. Classification uses IMPLEMENTED AND TESTED, UNVERIFIED, PARTIAL, BLOCKED, or MISSING.

**Go-live verdict: READY WITH DOCUMENTED LIMITATIONS**

Do not treat this as launch-ready for punch-based attendance, certified biometric hardware, or independently verified India statutory rates.

---

## Verdict

| Area | Classification | Notes |
|---|---|---|
| Auth (username/password, reset, disable) | IMPLEMENTED AND TESTED (unit) | Login rate limit, password policy, suspended-org block. Live Supabase Auth path is UNVERIFIED in this environment. |
| RBAC / session | IMPLEMENTED AND TESTED (unit) | Permission catalog + server guards. Custom role editing is PARTIAL (read-only matrix). |
| RLS / tenant isolation | PARTIAL / UNVERIFIED live | App filters by `organization_id`. SQL RLS exists. Live RLS proof against a second tenant is UNVERIFIED here. |
| Payroll calculate / finalize / lock / process | IMPLEMENTED AND TESTED (unit) | Engine, workflow, proration, loan EMI, leave-written LOP. Snapshot unique per run. Cancel/adjust blocked after finalize. |
| Statutory PF/ESI/PT/TDS/LWF | UNVERIFIED rates | Versioned engine with warnings. Seed versions DISABLED/unverified. Do not claim official rates. |
| Biometric ingest | IMPLEMENTED AND TESTED (unit parse/dedupe) | Token hash, duplicate device+user+time, unmapped vs mapped. Hardware UNVERIFIED. ZKTeco/Matrix PROTOCOL_FOUNDATION. |
| Attendance day engine | BLOCKED (Phase 4 not started) | Punches exist. Days are leave/holiday marks only. Unmarked working days paid. |
| ESS identity | IMPLEMENTED AND TESTED (unit) | Session `user_id` + org only. |
| API keys / webhooks / jobs | IMPLEMENTED AND TESTED (unit SSRF/HMAC) | Jobs secret compared in constant time. Webhook secret encrypted at rest when `SESSION_SECRET` is set. |
| Email | PARTIAL | SMTP optional. Unconfigured is never success. |
| Observability | IMPLEMENTED | `/api/health`, `/api/health/live`, structured logs without secrets. |
| Backup / deploy / SaaS ops | IMPLEMENTED (docs) | See `docs/ops/`. |

---

## Must pass before production traffic

1. `NEXT_PUBLIC_DEMO_MODE=false`.
2. Real `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `SUPABASE_JWT_SECRET`.
3. `SESSION_SECRET` is a long random string (required to persist webhook signing secrets across restarts).
4. `JOBS_WORKER_SECRET` set; a scheduler calls `POST /api/internal/jobs`.
5. Apply `supabase/combined.sql` (includes Phase 17 `secret_encrypted`). Existing projects also run `supabase/phase17.sql`.
6. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all pass.
7. Auth users exist for usernames at `{username}@{AUTH_EMAIL_DOMAIN}`.
8. `NEXT_PUBLIC_APP_URL` is the live HTTPS origin; add it to Supabase Auth redirect URLs.
9. Confirm `/api/health` returns `ok: true` without demo mode on the production host.
10. Confirm a suspended organization cannot sign in.
11. Confirm a finalized payroll run cannot be recalculated, cancelled, or adjusted in place.
12. Confirm biometric ingest with a wrong token returns 401 and does not create punches.

---

## Documented limitations (not blockers for a limited go-live)

- Phase 4 attendance is not started. Do not sell late, OT, or punch-derived LOP.
- Unmarked working days count as paid.
- Statutory seed versions are DISABLED and unverified. Enable only after a compliance owner pastes official sources into `source_citation`.
- ZKTeco and Matrix are protocol foundations, not certified hardware.
- In-memory rate limits are per process. Use an edge/WAF limit in multi-instance production.
- Email is SMTP only. WhatsApp/SMS are not implemented.
- Custom role editing UI is read-only.
- No billing provider is configured. Do not auto-delete tenant data on suspend.
- Demo credentials must never be used in production.

---

## Journey coverage (automated)

Synthetic fixtures only. No real employee or production financial data.

| Journey | Automated | Phase 4 |
|---|---|---|
| A Join → salary → leave → payroll | Yes (engine/formula/attendance summary) | Attendance calc skipped and flagged |
| B Punch ingest → map/unmap → retry duplicate | Yes (adapter + identity) | Day calc not claimed |
| C Leave unpaid → LOP in payroll summary | Yes | Punch LOP not claimed |
| D Loan EMI in payroll quote | Yes | |
| E Finalize → lock → process immutability | Yes (workflow) | |
| F Exit before period excluded from ordinary payroll | Yes | |

---

## Rollback

1. Stop sending traffic to the new deploy (platform rollback to previous successful build).
2. Do not reverse `combined.sql` / `phase17.sql` with DROP. The overlay is additive (`secret_encrypted` nullable).
3. Leave payroll runs that reached FINALIZED/LOCKED/PROCESSED/PAID untouched. Corrections are adjustment or reversal runs only.
4. Rotate `JOBS_WORKER_SECRET`, API keys, and webhook secrets if they leaked.
5. Record the incident in `docs/ops/INCIDENT.md`.

---

## Owner sign-off

- Engineering: lint, typecheck, test, build, health.
- Payroll operations: sample run on a non-production org with known expected net.
- Compliance: statutory versions verified or left disabled.
- Security: no `NEXT_PUBLIC_` service-role key, demo mode off, suspended-org login blocked.
