import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";

export type HealthStatus = "ok" | "degraded";

export function collectHealth() {
  const demo = isDemoMode() || !hasSupabaseConfig();
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      (process.env.SMTP_FROM || process.env.MAIL_FROM)
  );
  const jobsWorkerConfigured = Boolean(process.env.JOBS_WORKER_SECRET);
  const sessionSecretConfigured = Boolean(
    process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "replace-with-a-long-random-string"
  );
  const paymentProviderConfigured = Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
  const status: HealthStatus = "ok";
  return {
    ok: true,
    status,
    service: "bsb-payroll",
    timestamp: new Date().toISOString(),
    mode: demo ? "demo" : "live",
    checks: {
      demoMode: demo,
      supabaseConfigured: hasSupabaseConfig(),
      jobsWorkerConfigured,
      smtpConfigured,
      sessionSecretConfigured,
      paymentProviderConfigured,
    },
    limitations: {
      attendanceCalculation: false,
      statutoryRatesVerified: false,
      biometricHardwareCertified: false,
      billingChargesVerified: false,
      backupRestoreVerified: false,
      liveRlsVerified: false,
    },
  };
}
