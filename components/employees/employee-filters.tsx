"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUSES } from "@/lib/constants";
import type { Branch, Department, Designation, Employee, EmploymentType } from "@/types";

export function EmployeeFilters({
  filters,
  branches,
  departments,
  designations,
  employmentTypes,
  employees,
}: {
  filters: Record<string, string>;
  branches: Branch[];
  departments: Department[];
  designations: Designation[];
  employmentTypes: EmploymentType[];
  employees: Employee[];
}) {
  const router = useRouter();

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    const query = params.toString();
    router.push(query ? `/employees?${query}` : "/employees");
  }

  return (
    <form action={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-4">
      <div className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input name="q" className="pl-9" placeholder="Search name, ID, mobile or email" defaultValue={filters.q ?? ""} />
      </div>
      <Select name="status" defaultValue={filters.status ?? ""}>
        <option value="">All statuses</option>
        {EMPLOYEE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {EMPLOYEE_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <Select name="branchId" defaultValue={filters.branchId ?? ""}>
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </Select>
      <Select name="departmentId" defaultValue={filters.departmentId ?? ""}>
        <option value="">All departments</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </Select>
      <Select name="designationId" defaultValue={filters.designationId ?? ""}>
        <option value="">All designations</option>
        {designations.map((designation) => (
          <option key={designation.id} value={designation.id}>
            {designation.name}
          </option>
        ))}
      </Select>
      <Select name="employmentTypeId" defaultValue={filters.employmentTypeId ?? ""}>
        <option value="">All employment types</option>
        {employmentTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </Select>
      <Select name="managerId" defaultValue={filters.managerId ?? ""}>
        <option value="">All managers</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.display_name}
          </option>
        ))}
      </Select>
      <Input type="date" name="joiningFrom" defaultValue={filters.joiningFrom ?? ""} aria-label="Joining from" />
      <Input type="date" name="joiningTo" defaultValue={filters.joiningTo ?? ""} aria-label="Joining to" />
      <Select name="sort" defaultValue={filters.sort ?? "name"}>
        <option value="name">Sort by name</option>
        <option value="code">Sort by employee ID</option>
        <option value="joining">Sort by joining date</option>
        <option value="status">Sort by status</option>
      </Select>
      <div className="flex gap-2 md:col-span-2 xl:col-span-1">
        <Button type="submit" className="flex-1">
          Apply
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/employees")}>
          Reset
        </Button>
      </div>
    </form>
  );
}
