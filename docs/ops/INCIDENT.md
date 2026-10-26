# Incident response

1. Contain: disable public ingest tokens, rotate `JOBS_WORKER_SECRET` and leaked API/webhook secrets, set org `SUSPENDED` if a single tenant is compromised.
2. Do not rewrite finalized payroll. Use adjustment or reversal runs.
3. Preserve audit_logs, login_attempts, biometric_raw_events, webhook_delivery_attempts.
4. Record: time, impact (org ids only, never full bank/Aadhaar), actions, rollback.
5. After restore, confirm `/api/health` and a known payroll snapshot hash/count.

Never paste service-role keys, SMTP passwords, or full PAN/Aadhaar/account numbers into tickets.
