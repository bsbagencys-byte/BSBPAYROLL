"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveLoanPolicyAction } from "@/actions/loans";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { POLICY_SCOPES, POLICY_SCOPE_LABELS } from "@/lib/constants";
import type {
  ActionResult,
  Branch,
  Department,
  Designation,
  Employee,
  EmploymentType,
  LoanPolicy,
  LoanType,
} from "@/types";

const initial: ActionResult = { success: false };

export function LoanPolicyForm({
  row,
  types,
  branches,
  departments,
  designations,
  employmentTypes,
  employees,
}: {
  row?: LoanPolicy;
  types: LoanType[];
  branches: Branch[];
  departments: Department[];
  designations: Designation[];
  employmentTypes: EmploymentType[];
  employees: Employee[];
}) {
  const [state, action, pending] = useActionState(saveLoanPolicyAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add loan policy"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="name">Policy name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={row?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="loanTypeId">Loan type</Label>
            <Select id="loanTypeId" name="loanTypeId" className="mt-1" defaultValue={row?.loan_type_id ?? ""} required>
              <option value="">Select loan type</option>
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.loanTypeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="scope">Applies to</Label>
            <Select id="scope" name="scope" className="mt-1" defaultValue={row?.scope ?? "ORGANIZATION"}>
              {POLICY_SCOPES.map((item) => (
                <option key={item} value={item}>
                  {POLICY_SCOPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="maxAmount">Maximum amount</Label>
            <Input id="maxAmount" name="maxAmount" className="mt-1" defaultValue={row?.max_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxTenureMonths">Maximum tenure</Label>
            <Input id="maxTenureMonths" name="maxTenureMonths" className="mt-1" defaultValue={row?.max_tenure_months ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxActiveLoans">Max active loans</Label>
            <Input id="maxActiveLoans" name="maxActiveLoans" className="mt-1" defaultValue={row?.max_active_loans ?? ""} />
          </div>
          <div>
            <Label htmlFor="minServiceMonths">Min service months</Label>
            <Input id="minServiceMonths" name="minServiceMonths" className="mt-1" defaultValue={row?.min_service_months ?? ""} />
          </div>
          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select id="branchId" name="branchId" className="mt-1" defaultValue={row?.branch_id ?? ""}>
              <option value="">Any</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="departmentId">Department</Label>
            <Select id="departmentId" name="departmentId" className="mt-1" defaultValue={row?.department_id ?? ""}>
              <option value="">Any</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="designationId">Designation</Label>
            <Select id="designationId" name="designationId" className="mt-1" defaultValue={row?.designation_id ?? ""}>
              <option value="">Any</option>
              {designations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="employmentTypeId">Employment type</Label>
            <Select id="employmentTypeId" name="employmentTypeId" className="mt-1" defaultValue={row?.employment_type_id ?? ""}>
              <option value="">Any</option>
              {employmentTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="employeeId">Employee</Label>
            <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={row?.employee_id ?? ""}>
              <option value="">Any</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={row?.effective_from} required />
            <FieldError>{state.errors?.effectiveFrom?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="effectiveTo">Effective to</Label>
            <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" defaultValue={row?.effective_to ?? ""} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Update policy" : "Save policy"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
