import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { getEmployeeRecord } from "@/lib/employee-query";
import { recordToFormValues } from "@/lib/employee-form";
import { loadOrgCatalog } from "@/lib/org-data";
import { loadEmployeeLeave } from "@/lib/leave/query";
import { loadEmployeeCompensation } from "@/lib/salary/query";
import { listBenefitTypes, listEmployeeBenefits } from "@/lib/claims/repository";
import { loadClaimListItems } from "@/lib/claims/query";
import { loadAccountListItems, loadLoanListItems } from "@/lib/loans/query";
import { listLoanRepayments } from "@/lib/loans/repository";

export const metadata = { title: "Employee profile" };

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermissionOrRedirect("employee.view");
  const { id } = await params;
  const canViewSalary = hasPermission(user, "salary.view");
  const canViewBenefits = hasPermission(user, "benefits.view");
  const canViewClaims = hasPermission(user, "claims.view");
  const canViewLoans = hasPermission(user, "loans.view");
  const [record, catalog, leave, salary, benefitAssignments, benefitTypes, claims, loanAccounts, loanApplications, loanRepayments] = await Promise.all([
    getEmployeeRecord(user.organization.id, id),
    loadOrgCatalog(user.organization.id),
    loadEmployeeLeave(user.organization.id, id, user.organization.timezone),
    canViewSalary ? loadEmployeeCompensation(user.organization.id, id, user.organization.timezone) : Promise.resolve(null),
    canViewBenefits ? listEmployeeBenefits(user.organization.id) : Promise.resolve([]),
    canViewBenefits ? listBenefitTypes(user.organization.id) : Promise.resolve([]),
    canViewClaims ? loadClaimListItems(user.organization.id) : Promise.resolve([]),
    canViewLoans ? loadAccountListItems(user.organization.id, user.organization.timezone) : Promise.resolve([]),
    canViewLoans ? loadLoanListItems(user.organization.id) : Promise.resolve([]),
    canViewLoans ? listLoanRepayments(user.organization.id) : Promise.resolve([]),
  ]);
  if (!record) notFound();
  const employeeLoanAccounts = loanAccounts.filter((item) => item.account.employee_id === id);
  const employeeLoanAccountIds = new Set(employeeLoanAccounts.map((item) => item.account.id));

  return (
    <div>
      <PageHeader title="Employee profile" description="Master data, documents, leave, salary, benefits, claims and loans. Attendance calculation and payroll runs stay in later phases." />
      <EmployeeProfile
        record={record}
        values={recordToFormValues(record)}
        catalog={catalog}
        canEdit={hasPermission(user, "employee.edit")}
        canDisable={hasPermission(user, "employee.disable")}
        canDocuments={hasPermission(user, "employee.documents")}
        timezone={user.organization.timezone}
        leaveBalances={leave.balances}
        leaveRequests={leave.requests}
        salarySnapshot={salary?.snapshot ?? null}
        salaryHistory={salary?.history ?? []}
        salaryRevisions={salary?.revisions ?? []}
        canViewSalary={canViewSalary}
        canManageSalary={hasPermission(user, "salary.manage")}
        canReviseSalary={hasPermission(user, "salary.revision.create")}
        benefitAssignments={benefitAssignments.filter((item) => item.employee_id === id)}
        benefitTypes={benefitTypes}
        claimItems={claims.filter((item) => item.claim.employee_id === id)}
        canViewBenefits={canViewBenefits}
        canViewClaims={canViewClaims}
        loanAccounts={employeeLoanAccounts}
        loanApplications={loanApplications.filter((item) => item.application.employee_id === id)}
        loanRepayments={loanRepayments.filter((item) => employeeLoanAccountIds.has(item.account_id))}
        canViewLoans={canViewLoans}
      />
    </div>
  );
}
