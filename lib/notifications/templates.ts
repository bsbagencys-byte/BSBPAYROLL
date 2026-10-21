import { TEMPLATE_VARIABLES } from "@/lib/constants";

const TOKEN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function extractTemplateVariables(source: string) {
  const found = new Set<string>();
  for (const match of source.matchAll(TOKEN)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

export function validateTemplateVariables(source: string) {
  const unknown = extractTemplateVariables(source).filter(
    (name) => !(TEMPLATE_VARIABLES as readonly string[]).includes(name)
  );
  return unknown;
}

export function renderTemplate(source: string, vars: Record<string, string | number | null | undefined>) {
  return source.replace(TOKEN, (_, name: string) => {
    const value = vars[name];
    if (value === null || value === undefined || value === "") return "";
    return String(value);
  });
}

export function templateContext(payload: Record<string, unknown>, extras?: Record<string, string | null>) {
  return {
    employee_name: String(payload.employeeName ?? extras?.employee_name ?? ""),
    employee_code: String(payload.employeeCode ?? extras?.employee_code ?? ""),
    organization_name: String(payload.organizationName ?? extras?.organization_name ?? ""),
    status: String(payload.status ?? extras?.status ?? ""),
    period: String(payload.period ?? extras?.period ?? ""),
    amount: String(payload.amount ?? extras?.amount ?? ""),
    due_date: String(payload.dueDate ?? extras?.due_date ?? ""),
    title: String(payload.title ?? extras?.title ?? ""),
    body: String(payload.body ?? extras?.body ?? ""),
    href: String(payload.href ?? extras?.href ?? ""),
  };
}
