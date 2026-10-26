export const ORG_A = "org-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const ORG_B = "org-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const EMPLOYEE_A = "emp-synthetic-0001";
export const EMPLOYEE_B = "emp-synthetic-0002";

export function salarySnapshot(basic = 15000, da = 0, ctc = 300000) {
  return {
    assignmentId: "asg-synthetic",
    structureId: "str-synthetic",
    structureName: "Synthetic",
    ctcAnnual: ctc,
    ctcMonthly: Math.round(ctc / 12),
    grossMonthly: basic + da,
    lines: [
      {
        componentId: "c-basic",
        code: "BASIC",
        name: "Basic",
        componentType: "EARNING" as const,
        calculationMethod: "FIXED" as const,
        amount: basic,
        taxable: true,
      },
      {
        componentId: "c-da",
        code: "DA",
        name: "Dearness allowance",
        componentType: "EARNING" as const,
        calculationMethod: "FIXED" as const,
        amount: da,
        taxable: true,
      },
    ],
  };
}

export function attendanceDay(workDate: string, status: string, organizationId = ORG_A, employeeId = EMPLOYEE_A) {
  return {
    id: `day-${workDate}`,
    organization_id: organizationId,
    employee_id: employeeId,
    work_date: workDate,
    status,
    source: "LEAVE",
    leave_request_id: null,
    previous_status: null,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}
