import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { getDemoStore } from "@/lib/demo-store";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupName } from "@/lib/utils";
import type { Employee, EmployeeEmployment } from "@/types";

export const metadata = { title: "Organisation hierarchy" };

type Node = {
  employee: Employee;
  employment: EmployeeEmployment | null;
  children: Node[];
};

function buildTree(employees: Employee[], employment: EmployeeEmployment[]) {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const children = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  employees.forEach((employee) => {
    const row = employment.find((item) => item.employee_id === employee.id);
    const managerId = row?.reporting_manager_id;
    if (managerId && byId.has(managerId) && managerId !== employee.id) {
      const list = children.get(managerId) ?? [];
      list.push(employee);
      children.set(managerId, list);
    } else {
      roots.push(employee);
    }
  });

  function toNode(employee: Employee, seen: Set<string>): Node {
    const next = new Set(seen);
    next.add(employee.id);
    const kids = (children.get(employee.id) ?? []).filter((child) => !next.has(child.id));
    return {
      employee,
      employment: employment.find((item) => item.employee_id === employee.id) ?? null,
      children: kids.map((child) => toNode(child, next)),
    };
  }

  return roots.map((employee) => toNode(employee, new Set()));
}

function Tree({ nodes, designations }: { nodes: Node[]; designations: { id: string; name: string }[] }) {
  if (nodes.length === 0) return null;
  return (
    <ul className="space-y-3 border-l border-slate-200 pl-4">
      {nodes.map((node) => (
        <li key={node.employee.id}>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Link href={`/employees/${node.employee.id}`} className="font-medium text-brand-800 hover:underline">
              {node.employee.display_name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{node.employee.employee_code}</span>
              <Badge variant="muted">{lookupName(designations, node.employment?.designation_id) ?? "No designation"}</Badge>
            </div>
          </div>
          <div className="mt-3">
            <Tree nodes={node.children} designations={designations} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function HierarchyPage() {
  const user = await requirePermissionOrRedirect("employee.view");
  let employees: Employee[] = [];
  let employment: EmployeeEmployment[] = [];
  let designations: { id: string; name: string }[] = [];

  if (!hasSupabaseConfig() || isDemoMode()) {
    const store = getDemoStore();
    employees = store.employees;
    employment = store.employeeEmployment;
    designations = store.designations;
  } else {
    const admin = createAdminClient();
    if (admin) {
      const [people, jobs, titles] = await Promise.all([
        admin.from("employees").select("*").eq("organization_id", user.organization.id).order("display_name"),
        admin.from("employee_employment").select("*").eq("organization_id", user.organization.id),
        admin.from("designations").select("id, name").eq("organization_id", user.organization.id),
      ]);
      employees = (people.data ?? []) as Employee[];
      employment = (jobs.data ?? []) as EmployeeEmployment[];
      designations = (titles.data ?? []) as { id: string; name: string }[];
    }
  }

  const tree = buildTree(employees, employment);

  return (
    <div>
      <PageHeader title="Organisation hierarchy" description="Reporting tree based on current manager assignments." />
      {tree.length === 0 ? (
        <EmptyState title="No reporting tree" description="Add employees and assign reporting managers to see the hierarchy." />
      ) : (
        <Tree nodes={tree} designations={designations} />
      )}
    </div>
  );
}
