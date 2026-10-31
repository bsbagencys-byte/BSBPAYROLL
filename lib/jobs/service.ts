import { JOB_TYPES, type JobType } from "@/lib/constants";
import {
  getJobExecution,
  getScheduledJob,
  insertJobExecution,
  listDueScheduledJobs,
  listJobExecutions,
  listScheduledJobs,
  updateJobExecution,
  upsertScheduledJob,
} from "@/lib/events/repository";
import { processOutbox } from "@/lib/events/bus";
import { emitDomainEvent } from "@/lib/events/bus";
import { retryFailedEmails } from "@/lib/notifications/service";
import { retryWebhookAttempts } from "@/lib/webhooks/service";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { listOrgUsersWithRoles } from "@/lib/ess/repository";
import type { ScheduledJob } from "@/types";

function stamp() {
  return new Date().toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function nextHourly() {
  return hoursFromNow(1);
}

export async function ensureDefaultJobs(organizationId: string, actorId: string | null) {
  const existing = await listScheduledJobs(organizationId);
  const defs: Array<{ jobType: JobType; name: string }> = [
    { jobType: "OUTBOX_PROCESS", name: "Process event outbox" },
    { jobType: "PENDING_APPROVAL_REMINDER", name: "Pending approval reminders" },
    { jobType: "UPCOMING_LEAVE_REMINDER", name: "Upcoming leave reminders" },
    { jobType: "LOAN_REPAYMENT_REMINDER", name: "Loan repayment reminders" },
    { jobType: "CONTRACT_EXPIRY_ALERT", name: "Contract expiry alerts" },
    { jobType: "BIOMETRIC_DEVICE_HEALTH", name: "Biometric device health" },
    { jobType: "PAYROLL_PERIOD_REMINDER", name: "Payroll period reminders" },
    { jobType: "FAILED_JOB_RETRY", name: "Failed delivery retries" },
    { jobType: "SUBSCRIPTION_LIFECYCLE", name: "Subscription lifecycle" },
    { jobType: "SUPPORT_SLA", name: "Support ticket SLA reminders" },
    { jobType: "DATA_EXPORT_EXPIRE", name: "Expire completed data exports" },
    { jobType: "INCIDENT_SLA", name: "Open incident SLA reminders" },
  ];
  const created: ScheduledJob[] = [];
  for (const def of defs) {
    if (existing.some((item) => item.job_type === def.jobType)) continue;
    created.push(
      await upsertScheduledJob({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        job_type: def.jobType,
        name: def.name,
        cron_expr: "hourly",
        timezone: "Asia/Kolkata",
        payload_json: "{}",
        enabled: true,
        next_run_at: stamp(),
        last_run_at: null,
        last_status: null,
        created_by: actorId,
        updated_by: actorId,
        created_at: stamp(),
        updated_at: stamp(),
      })
    );
  }
  return created;
}

async function loadOrgTimezone(organizationId: string) {
  if (!hasSupabaseConfig() || isDemoMode()) {
    return getDemoStore().org.timezone || "Asia/Kolkata";
  }
  const admin = createAdminClient();
  if (!admin) return "Asia/Kolkata";
  const { data } = await admin.from("organizations").select("timezone").eq("id", organizationId).maybeSingle();
  return (data?.timezone as string | undefined) || "Asia/Kolkata";
}

async function runJobBody(job: ScheduledJob): Promise<Record<string, unknown>> {
  switch (job.job_type) {
    case "OUTBOX_PROCESS": {
      const result = await processOutbox({ workerId: `job:${job.id}` });
      return result;
    }
    case "FAILED_JOB_RETRY": {
      const emails = await retryFailedEmails();
      const webhooks = await retryWebhookAttempts();
      return { emails, webhooks };
    }
    case "PENDING_APPROVAL_REMINDER": {
      const store = !hasSupabaseConfig() || isDemoMode() ? getDemoStore() : null;
      const pendingLeaves = store?.leaveRequests.filter((item) => item.status === "PENDING").length ?? 0;
      const pendingClaims = store?.claims.filter((item) => item.status === "SUBMITTED" || item.status === "PENDING_APPROVAL").length ?? 0;
      if (pendingLeaves + pendingClaims > 0) {
        await emitDomainEvent({
          organizationId: job.organization_id,
          eventType: "approval.overdue",
          entityType: "scheduled_job",
          entityId: job.id,
          payload: {
            body: `${pendingLeaves} leave and ${pendingClaims} claim approvals are still pending.`,
            href: "/leave/approvals",
            status: "OVERDUE",
          },
          idempotencyKey: `approval.overdue:${job.organization_id}:${new Date().toISOString().slice(0, 13)}`,
        });
      }
      return { pendingLeaves, pendingClaims };
    }
    case "UPCOMING_LEAVE_REMINDER": {
      const store = !hasSupabaseConfig() || isDemoMode() ? getDemoStore() : null;
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = store?.leaveRequests.filter((item) => item.status === "APPROVED" && item.from_date >= today).length ?? 0;
      return { upcoming };
    }
    case "LOAN_REPAYMENT_REMINDER": {
      const store = !hasSupabaseConfig() || isDemoMode() ? getDemoStore() : null;
      const due = store?.loanSchedule.filter((item) => item.status === "DUE" || item.status === "OVERDUE").length ?? 0;
      if (due > 0) {
        await emitDomainEvent({
          organizationId: job.organization_id,
          eventType: "loan.installment.due",
          payload: { body: `${due} loan instalments are due.`, href: "/loans/repayments" },
          idempotencyKey: `loan.due:${job.organization_id}:${new Date().toISOString().slice(0, 10)}`,
        });
      }
      return { due };
    }
    case "CONTRACT_EXPIRY_ALERT": {
      const store = !hasSupabaseConfig() || isDemoMode() ? getDemoStore() : null;
      const today = new Date();
      const soon = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);
      const expiring = store?.contractorEngagements.filter((item) => item.end_date && item.end_date <= soon && item.status === "ACTIVE") ?? [];
      for (const row of expiring) {
        await emitDomainEvent({
          organizationId: job.organization_id,
          eventType: "contractor.engagement.expiring",
          entityType: "contractor_engagement",
          entityId: row.id,
          payload: { title: row.id, body: `Engagement ends ${row.end_date}.`, href: "/contractors/engagements" },
          idempotencyKey: `contract.expiring:${row.id}:${row.end_date}`,
        });
      }
      return { expiring: expiring.length };
    }
    case "BIOMETRIC_DEVICE_HEALTH": {
      const store = !hasSupabaseConfig() || isDemoMode() ? getDemoStore() : null;
      const devices = store?.biometricDevices ?? [];
      let offline = 0;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const device of devices) {
        const seen = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;
        if (device.last_error || !seen || seen < cutoff) {
          offline += 1;
          await emitDomainEvent({
            organizationId: job.organization_id,
            eventType: "biometric.device.error",
            entityType: "biometric_device",
            entityId: device.id,
            payload: { body: device.last_error || `${device.name} has not reported recently.`, href: "/biometric" },
            idempotencyKey: `device.health:${device.id}:${new Date().toISOString().slice(0, 10)}`,
          });
        }
      }
      return { devices: devices.length, offline };
    }
    case "PAYROLL_PERIOD_REMINDER": {
      const users = await listOrgUsersWithRoles(job.organization_id);
      return { notifiedRoles: users.filter((item) => ["HR", "PAYROLL"].includes(item.roleCode)).length };
    }
    case "SUBSCRIPTION_LIFECYCLE": {
      const { expireDueSubscriptions } = await import("@/lib/billing/service");
      const updated = await expireDueSubscriptions();
      return { updated: updated.length };
    }
    case "SUPPORT_SLA": {
      const { markSupportSla } = await import("@/lib/onboarding/service");
      return markSupportSla();
    }
    case "DATA_EXPORT_EXPIRE": {
      const { expireReadyExports } = await import("@/lib/onboarding/service");
      return expireReadyExports();
    }
    case "INCIDENT_SLA": {
      const { markIncidentSla } = await import("@/lib/launch/service");
      return markIncidentSla();
    }
    default:
      return { skipped: true };
  }
}

export async function executeDueJobs(workerId = "scheduler") {
  const due = await listDueScheduledJobs();
  const results: { jobId: string; ok: boolean; error?: string }[] = [];
  for (const job of due) {
    const scheduledFor = job.next_run_at ?? stamp();
    const execution = await insertJobExecution({
      id: crypto.randomUUID(),
      organization_id: job.organization_id,
      job_id: job.id,
      status: "RUNNING",
      attempt_count: 1,
      scheduled_for: scheduledFor,
      started_at: stamp(),
      completed_at: null,
      locked_at: stamp(),
      locked_by: workerId,
      result_json: null,
      error_message: null,
      created_at: stamp(),
    });
    if (!execution) continue;
    try {
      const result = await runJobBody(job);
      await updateJobExecution(execution.id, {
        status: "COMPLETED",
        completed_at: stamp(),
        result_json: JSON.stringify(result),
        locked_at: null,
        locked_by: null,
      });
      await upsertScheduledJob({
        ...job,
        last_run_at: stamp(),
        last_status: "COMPLETED",
        next_run_at: nextHourly(),
        updated_at: stamp(),
      });
      results.push({ jobId: job.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "Job failed.";
      await updateJobExecution(execution.id, {
        status: "FAILED",
        completed_at: stamp(),
        error_message: message,
        locked_at: null,
        locked_by: null,
      });
      await upsertScheduledJob({
        ...job,
        last_run_at: stamp(),
        last_status: "FAILED",
        next_run_at: hoursFromNow(1),
        updated_at: stamp(),
      });
      results.push({ jobId: job.id, ok: false, error: message });
    }
  }
  return { due: due.length, results };
}

export async function retryJobExecution(organizationId: string, executionId: string, actorId: string | null) {
  const execution = await getJobExecution(organizationId, executionId);
  if (!execution) throw new Error("Job execution not found.");
  if (execution.status === "RUNNING") throw new Error("Execution is already running.");
  const job = await getScheduledJob(organizationId, execution.job_id);
  if (!job) throw new Error("Scheduled job not found.");
  await upsertScheduledJob({ ...job, next_run_at: stamp(), updated_by: actorId, updated_at: stamp() });
  return executeDueJobs(`retry:${actorId ?? "user"}`);
}

export async function cancelJobExecution(organizationId: string, executionId: string) {
  const execution = await getJobExecution(organizationId, executionId);
  if (!execution) throw new Error("Job execution not found.");
  if (execution.status === "COMPLETED") throw new Error("Completed executions cannot be cancelled.");
  await updateJobExecution(execution.id, { status: "CANCELLED", completed_at: stamp(), locked_at: null, locked_by: null });
}

export async function toggleScheduledJob(organizationId: string, jobId: string, enabled: boolean, actorId: string | null) {
  const job = await getScheduledJob(organizationId, jobId);
  if (!job) throw new Error("Scheduled job not found.");
  if (!(JOB_TYPES as readonly string[]).includes(job.job_type)) throw new Error("Unknown job type.");
  return upsertScheduledJob({
    ...job,
    enabled,
    updated_by: actorId,
    updated_at: stamp(),
    next_run_at: enabled ? stamp() : job.next_run_at,
  });
}

export { listScheduledJobs, listJobExecutions, getScheduledJob, getJobExecution, loadOrgTimezone };
