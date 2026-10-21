import type { AutomationEventType, AutomationTriggerType, EssNotificationType, RoleCode } from "@/lib/constants";

export const EVENT_VERSION = 1;

export const SENSITIVE_PAYLOAD_KEYS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "account_number",
  "accountNumber",
  "aadhaar",
  "pan",
  "ifsc",
];

export type EventPayload = Record<string, unknown>;

export type DefaultNotificationPlan = {
  type: EssNotificationType;
  title: string;
  body: string;
  href: string | null;
  recipientRoles?: RoleCode[];
  toEmployee?: boolean;
};

export const EVENT_TO_TRIGGER: Partial<Record<AutomationEventType, AutomationTriggerType>> = {
  "leave.request.updated": "leave.request.updated",
  "payroll.run.calculated": "payroll.run.status_changed",
  "payroll.run.approved": "payroll.run.status_changed",
  "payroll.run.finalized": "payroll.run.status_changed",
  "payslip.generated": "payslip.generated",
  "claim.status_changed": "claim.status_changed",
  "loan.installment.due": "loan.installment.due",
  "loan.installment.overdue": "loan.installment.overdue",
  "employee.created": "employee.created",
  "employee.exit.updated": "employee.exit.updated",
  "contractor.engagement.expiring": "contractor.engagement.expiring",
  "biometric.device.error": "biometric.device.error",
  "payment.failed": "payment.failed",
  "approval.overdue": "approval.overdue",
};

export function sanitizePayload(input: EventPayload): EventPayload {
  const out: EventPayload = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_PAYLOAD_KEYS.includes(key)) continue;
    if (value === undefined) continue;
    if (typeof value === "string" && value.length > 2000) {
      out[key] = `${value.slice(0, 2000)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function defaultNotificationPlan(eventType: string, payload: EventPayload): DefaultNotificationPlan | null {
  const status = String(payload.status ?? "");
  const name = String(payload.employeeName ?? payload.title ?? "Record");
  const period = String(payload.period ?? "");
  switch (eventType) {
    case "leave.request.updated":
      return {
        type: status === "APPROVED" || status === "REJECTED" ? "APPROVAL" : "INFO",
        title: `Leave ${status.toLowerCase() || "updated"}`,
        body: `Your leave request was ${status.toLowerCase() || "updated"}.`,
        href: "/my/leave",
        toEmployee: true,
      };
    case "payroll.run.calculated":
      return {
        type: "INFO",
        title: "Payroll calculated",
        body: period ? `Payroll for ${period} has been calculated.` : "A payroll run was calculated.",
        href: "/payroll/runs",
        recipientRoles: ["HR", "PAYROLL", "SUPER_ADMIN", "ADMIN"],
      };
    case "payroll.run.approved":
      return {
        type: "APPROVAL",
        title: "Payroll approved",
        body: period ? `Payroll for ${period} was approved.` : "A payroll run was approved.",
        href: "/payroll/runs",
        recipientRoles: ["HR", "PAYROLL", "SUPER_ADMIN", "ADMIN"],
      };
    case "payroll.run.finalized":
      return {
        type: "INFO",
        title: "Payroll finalized",
        body: period ? `Payroll for ${period} is finalized.` : "A payroll run was finalized.",
        href: "/payroll/runs",
        recipientRoles: ["HR", "PAYROLL", "ACCOUNTANT", "SUPER_ADMIN", "ADMIN"],
      };
    case "payslip.generated":
      return {
        type: "INFO",
        title: "Payslip generated",
        body: period ? `Your payslip for ${period} is ready.` : "A payslip is ready.",
        href: "/my/payslips",
        toEmployee: true,
      };
    case "claim.status_changed":
      return {
        type: status === "APPROVED" || status === "REJECTED" ? "APPROVAL" : "INFO",
        title: `Claim ${status.toLowerCase() || "updated"}`,
        body: `Your claim was ${status.toLowerCase() || "updated"}.`,
        href: "/my/claims",
        toEmployee: true,
      };
    case "loan.application.updated":
      return {
        type: "APPROVAL",
        title: `Loan ${status.toLowerCase() || "updated"}`,
        body: `Your loan application was ${status.toLowerCase() || "updated"}.`,
        href: "/my/loans",
        toEmployee: true,
      };
    case "loan.installment.due":
      return {
        type: "ACTION",
        title: "Loan repayment due",
        body: "An EMI is due this period.",
        href: "/my/loans",
        toEmployee: true,
      };
    case "loan.installment.overdue":
      return {
        type: "ALERT",
        title: "Loan repayment overdue",
        body: "An EMI is overdue.",
        href: "/loans/repayments",
        toEmployee: true,
        recipientRoles: ["HR", "PAYROLL", "ACCOUNTANT"],
      };
    case "employee.created":
      return {
        type: "INFO",
        title: "Employee joined",
        body: `${name} was added to the organisation.`,
        href: "/employees",
        recipientRoles: ["HR", "SUPER_ADMIN", "ADMIN"],
      };
    case "employee.updated":
      return {
        type: "INFO",
        title: "Employee updated",
        body: `${name} was updated.`,
        href: "/employees",
        recipientRoles: ["HR"],
      };
    case "employee.exit.updated":
      return {
        type: "ALERT",
        title: "Employee exit updated",
        body: `${name} exit is now ${status || "updated"}.`,
        href: "/employees/exits",
        recipientRoles: ["HR", "PAYROLL", "SUPER_ADMIN", "ADMIN"],
        toEmployee: true,
      };
    case "contractor.engagement.expiring":
      return {
        type: "ACTION",
        title: "Contractor engagement expiring",
        body: `${name} engagement is nearing expiry.`,
        href: "/contractors/engagements",
        recipientRoles: ["HR", "ADMIN", "SUPER_ADMIN"],
      };
    case "contractor.payment.status_changed":
      return {
        type: "INFO",
        title: "Contractor payment updated",
        body: `Contractor payment is ${status || "updated"}.`,
        href: "/contractor-payments",
        recipientRoles: ["ACCOUNTANT", "HR", "PAYROLL"],
      };
    case "biometric.device.error":
      return {
        type: "ALERT",
        title: "Biometric device error",
        body: String(payload.body ?? payload.message ?? "A biometric device reported an error."),
        href: "/biometric",
        recipientRoles: ["HR", "ADMIN", "SUPER_ADMIN"],
      };
    case "payment.failed":
      return {
        type: "ALERT",
        title: "Salary payment failed",
        body: String(payload.body ?? "A salary payment item failed."),
        href: "/payments",
        recipientRoles: ["PAYROLL", "ACCOUNTANT", "HR"],
      };
    case "approval.overdue":
      return {
        type: "ACTION",
        title: "Approval overdue",
        body: String(payload.body ?? "An approval is overdue."),
        href: String(payload.href ?? "/dashboard"),
        recipientRoles: ["HR", "MANAGER", "PAYROLL"],
      };
    case "compliance.deadline":
      return {
        type: "ACTION",
        title: "Compliance deadline",
        body: String(payload.body ?? "A compliance filing deadline is approaching."),
        href: "/compliance",
        recipientRoles: ["HR", "PAYROLL", "ACCOUNTANT"],
      };
    default:
      return null;
  }
}

export const DEFAULT_TEMPLATES: Array<{
  key: string;
  name: string;
  eventType: string;
  subject: string;
  body: string;
}> = [
  {
    key: "leave.decision",
    name: "Leave decision",
    eventType: "leave.request.updated",
    subject: "Leave request {{status}}",
    body: "Hello {{employee_name}}, your leave request was {{status}}.",
  },
  {
    key: "payroll.finalized",
    name: "Payroll finalized",
    eventType: "payroll.run.finalized",
    subject: "Payroll {{period}} finalized",
    body: "Payroll for {{period}} at {{organization_name}} has been finalized.",
  },
  {
    key: "payslip.ready",
    name: "Payslip generated",
    eventType: "payslip.generated",
    subject: "Payslip for {{period}}",
    body: "Hello {{employee_name}}, your payslip for {{period}} is available in My Space. This message does not include a public document link.",
  },
  {
    key: "approval.pending",
    name: "Pending approval",
    eventType: "approval.overdue",
    subject: "Pending approval: {{title}}",
    body: "{{body}}",
  },
  {
    key: "claim.decision",
    name: "Claim decision",
    eventType: "claim.status_changed",
    subject: "Claim {{status}}",
    body: "Hello {{employee_name}}, your claim was {{status}}.",
  },
  {
    key: "device.alert",
    name: "Device alert",
    eventType: "biometric.device.error",
    subject: "Biometric device alert",
    body: "{{body}}",
  },
  {
    key: "contract.expiry",
    name: "Contract expiry",
    eventType: "contractor.engagement.expiring",
    subject: "Engagement expiring: {{title}}",
    body: "{{body}}",
  },
];
