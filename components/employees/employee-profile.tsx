"use client";

import { useState } from "react";
import Link from "next/link";
import { EmployeeDocuments } from "@/components/employees/employee-documents";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeHistoryList } from "@/components/employees/employee-history";
import { EmployeeStatusBadge } from "@/components/employees/status-badge";
import { EmployeeStatusForm } from "@/components/employees/employee-status-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { maskAadhaarLast4, maskAccountNumber } from "@/lib/mask";
import { cn, formatDateOnly, initials, lookupName } from "@/lib/utils";
import type { EmployeeFormValues } from "@/lib/validations/employee";
import type {
  Branch,
  Department,
  Designation,
  Employee,
  EmployeeRecord,
  EmploymentType,
  Location,
} from "@/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "personal", label: "Personal" },
  { id: "employment", label: "Employment" },
  { id: "org", label: "Organisation" },
  { id: "statutory", label: "Statutory" },
  { id: "bank", label: "Bank" },
  { id: "documents", label: "Documents" },
  { id: "history", label: "History" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave" },
  { id: "payroll", label: "Payroll" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EmployeeProfile({
  record,
  values,
  catalog,
  canEdit,
  canDisable,
  canDocuments,
  timezone,
}: {
  record: EmployeeRecord;
  values: Partial<EmployeeFormValues>;
  catalog: {
    branches: Branch[];
    departments: Department[];
    designations: Designation[];
    locations: Location[];
    employmentTypes: EmploymentType[];
    employees: Employee[];
  };
  canEdit: boolean;
  canDisable: boolean;
  canDocuments: boolean;
  timezone: string;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const { employee, address, employment, statutory, bank } = record;
  const manager = lookupName(catalog.employees, employment?.reporting_manager_id);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-lg font-semibold text-white">
              {initials(employee.display_name)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{employee.display_name}</h2>
              <p className="text-sm text-slate-500">
                {employee.employee_code} · {lookupName(catalog.designations, employment?.designation_id) ?? "No designation"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <EmployeeStatusBadge status={employee.status} />
                {employee.is_demo ? <Badge variant="muted">Demo</Badge> : null}
              </div>
            </div>
          </div>
          <Link href="/employees">
            <Button variant="outline">Back to list</Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              tab === item.id ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard title="Contact" rows={[
            ["Mobile", employee.mobile],
            ["Official email", employment?.official_email],
            ["Work phone", employment?.work_phone],
          ]} />
          <InfoCard title="Organisation" rows={[
            ["Department", lookupName(catalog.departments, employment?.department_id)],
            ["Branch", lookupName(catalog.branches, employment?.branch_id)],
            ["Manager", manager],
          ]} />
          <InfoCard title="Employment" rows={[
            ["Joined", formatDateOnly(employment?.joining_date)],
            ["Type", lookupName(catalog.employmentTypes, employment?.employment_type_id)],
            ["Location", lookupName(catalog.locations, employment?.location_id)],
          ]} />
        </div>
      ) : null}

      {tab === "personal" || tab === "employment" || tab === "org" || tab === "statutory" || tab === "bank" ? (
        <EmployeeForm employeeId={employee.id} values={values} canEdit={canEdit} catalog={catalog} />
      ) : null}

      {tab === "documents" ? (
        <EmployeeDocuments employeeId={employee.id} documents={record.documents} canManage={canDocuments} timezone={timezone} />
      ) : null}

      {tab === "history" ? (
        <div className="space-y-4">
          {canDisable ? <EmployeeStatusForm employeeId={employee.id} status={employee.status} /> : null}
          <EmployeeHistoryList history={record.history} timezone={timezone} />
        </div>
      ) : null}

      {tab === "attendance" ? <LaterPhase title="Attendance" phase={4} /> : null}
      {tab === "leave" ? <LaterPhase title="Leave" phase={5} /> : null}
      {tab === "payroll" ? <LaterPhase title="Payroll" phase={7} /> : null}

      {tab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Sensitive identifiers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>PAN: {statutory?.pan ?? "—"}</p>
            <p>Aadhaar: {maskAadhaarLast4(statutory?.aadhaar_last4)}</p>
            <p>Bank account: {maskAccountNumber(bank?.account_number)}</p>
            <p>IFSC: {bank?.ifsc ?? "—"}</p>
            <p className="sm:col-span-2 text-xs text-slate-500">
              Full Aadhaar is never stored. Address: {[address?.address_line1, address?.city, address?.state, address?.pin].filter(Boolean).join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function LaterPhase({ title, phase }: { title: string; phase: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="muted">Phase {phase}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        This module is not part of Employee and Organisation Management.
      </CardContent>
    </Card>
  );
}

function InfoCard({ title, rows }: { title: string; rows: [string, string | null | undefined][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-medium">{value || "—"}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
