"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveEmployeeAction } from "@/actions/employees";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUSES,
  GENDER_LABELS,
  GENDERS,
} from "@/lib/constants";
import type { EmployeeFormValues } from "@/lib/validations/employee";
import type { ActionResult, Branch, Department, Designation, Employee, EmploymentType, Location } from "@/types";

const initial: ActionResult<{ id: string }> = { success: false };

function Field({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  required,
  disabled,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} className="mt-1" defaultValue={defaultValue ?? ""} required={required} disabled={disabled} />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function EmployeeForm({
  employeeId,
  values,
  canEdit,
  catalog,
}: {
  employeeId?: string;
  values: Partial<EmployeeFormValues>;
  canEdit: boolean;
  catalog: {
    branches: Branch[];
    departments: Department[];
    designations: Designation[];
    locations: Location[];
    employmentTypes: EmploymentType[];
    employees: Employee[];
  };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: ActionResult<{ id: string }> | undefined, formData: FormData) => {
    const result = await saveEmployeeAction(prev, formData);
    if (result.success && result.data?.id && !employeeId) {
      router.push(`/employees/${result.data.id}`);
    }
    return result;
  }, initial);

  const managers = catalog.employees.filter((employee) => employee.id !== employeeId);

  return (
    <form action={action} className="space-y-4">
      {employeeId ? <input type="hidden" name="id" value={employeeId} /> : null}
      {state?.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" required defaultValue={values.firstName} error={state?.errors?.firstName?.[0]} disabled={!canEdit} />
          <Field label="Middle name" name="middleName" defaultValue={values.middleName} error={state?.errors?.middleName?.[0]} disabled={!canEdit} />
          <Field label="Last name" name="lastName" required defaultValue={values.lastName} error={state?.errors?.lastName?.[0]} disabled={!canEdit} />
          <Field label="Display name" name="displayName" defaultValue={values.displayName} error={state?.errors?.displayName?.[0]} disabled={!canEdit} />
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" name="gender" className="mt-1" defaultValue={values.gender ?? ""} disabled={!canEdit}>
              <option value="">Unspecified</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {GENDER_LABELS[gender]}
                </option>
              ))}
            </Select>
          </div>
          <Field label="Date of birth" name="dateOfBirth" type="date" defaultValue={values.dateOfBirth} error={state?.errors?.dateOfBirth?.[0]} disabled={!canEdit} />
          <Field label="Mobile" name="mobile" required defaultValue={values.mobile} error={state?.errors?.mobile?.[0]} disabled={!canEdit} />
          <Field label="Alternate mobile" name="alternateMobile" defaultValue={values.alternateMobile} error={state?.errors?.alternateMobile?.[0]} disabled={!canEdit} />
          <Field label="Personal email" name="personalEmail" type="email" defaultValue={values.personalEmail} error={state?.errors?.personalEmail?.[0]} disabled={!canEdit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address and emergency</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" name="addressLine1" className="sm:col-span-2" defaultValue={values.addressLine1} error={state?.errors?.addressLine1?.[0]} disabled={!canEdit} />
          <Field label="Address line 2" name="addressLine2" className="sm:col-span-2" defaultValue={values.addressLine2} disabled={!canEdit} />
          <Field label="City" name="city" defaultValue={values.city} error={state?.errors?.city?.[0]} disabled={!canEdit} />
          <Field label="State" name="state" defaultValue={values.state} error={state?.errors?.state?.[0]} disabled={!canEdit} />
          <Field label="PIN" name="pin" defaultValue={values.pin} error={state?.errors?.pin?.[0]} disabled={!canEdit} />
          <Field label="Emergency contact name" name="emergencyContactName" defaultValue={values.emergencyContactName} disabled={!canEdit} />
          <Field label="Emergency contact number" name="emergencyContactNumber" defaultValue={values.emergencyContactNumber} error={state?.errors?.emergencyContactNumber?.[0]} disabled={!canEdit} />
          <Field label="Relationship" name="emergencyRelationship" defaultValue={values.emergencyRelationship} disabled={!canEdit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee ID" name="employeeCode" required defaultValue={values.employeeCode} error={state?.errors?.employeeCode?.[0]} disabled={!canEdit} />
          <Field label="Joining date" name="joiningDate" type="date" required defaultValue={values.joiningDate} error={state?.errors?.joiningDate?.[0]} disabled={!canEdit} />
          <div>
            <Label htmlFor="employmentTypeId">Employment type</Label>
            <Select id="employmentTypeId" name="employmentTypeId" className="mt-1" defaultValue={values.employmentTypeId ?? ""} required disabled={!canEdit}>
              <option value="">Select type</option>
              {catalog.employmentTypes.filter((type) => type.status === "ACTIVE" || type.id === values.employmentTypeId).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <FieldError>{state?.errors?.employmentTypeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select id="branchId" name="branchId" className="mt-1" defaultValue={values.branchId ?? ""} required disabled={!canEdit}>
              <option value="">Select branch</option>
              {catalog.branches.filter((branch) => branch.status === "ACTIVE" || branch.id === values.branchId).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
            <FieldError>{state?.errors?.branchId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="departmentId">Department</Label>
            <Select id="departmentId" name="departmentId" className="mt-1" defaultValue={values.departmentId ?? ""} disabled={!canEdit}>
              <option value="">No department</option>
              {catalog.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="designationId">Designation</Label>
            <Select id="designationId" name="designationId" className="mt-1" defaultValue={values.designationId ?? ""} disabled={!canEdit}>
              <option value="">No designation</option>
              {catalog.designations.map((designation) => (
                <option key={designation.id} value={designation.id}>
                  {designation.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="reportingManagerId">Reporting manager</Label>
            <Select id="reportingManagerId" name="reportingManagerId" className="mt-1" defaultValue={values.reportingManagerId ?? ""} disabled={!canEdit}>
              <option value="">No manager</option>
              {managers.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name} ({employee.employee_code})
                </option>
              ))}
            </Select>
            <FieldError>{state?.errors?.reportingManagerId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="locationId">Work location</Label>
            <Select id="locationId" name="locationId" className="mt-1" defaultValue={values.locationId ?? ""} disabled={!canEdit}>
              <option value="">No location</option>
              {catalog.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={values.status ?? "ACTIVE"} disabled={!canEdit}>
              {EMPLOYEE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {EMPLOYEE_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
          <Field label="Official email" name="officialEmail" type="email" defaultValue={values.officialEmail} error={state?.errors?.officialEmail?.[0]} disabled={!canEdit} />
          <Field label="Work phone" name="workPhone" defaultValue={values.workPhone} error={state?.errors?.workPhone?.[0]} disabled={!canEdit} />
          {employeeId ? (
            <Field label="Change reason" name="changeReason" className="sm:col-span-2" defaultValue="" disabled={!canEdit} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statutory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="PAN" name="pan" defaultValue={values.pan} error={state?.errors?.pan?.[0]} disabled={!canEdit} />
          <Field label="Aadhaar last 4" name="aadhaarLast4" defaultValue={values.aadhaarLast4} error={state?.errors?.aadhaarLast4?.[0]} disabled={!canEdit} />
          <Field label="UAN" name="uan" defaultValue={values.uan} disabled={!canEdit} />
          <Field label="ESIC number" name="esicNumber" defaultValue={values.esicNumber} disabled={!canEdit} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pfApplicable" defaultChecked={Boolean(values.pfApplicable)} disabled={!canEdit} />
            PF applicable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="esiApplicable" defaultChecked={Boolean(values.esiApplicable)} disabled={!canEdit} />
            ESI applicable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ptApplicable" defaultChecked={Boolean(values.ptApplicable)} disabled={!canEdit} />
            PT applicable
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Account holder name" name="accountHolderName" defaultValue={values.accountHolderName} disabled={!canEdit} />
          <Field label="Bank name" name="bankName" defaultValue={values.bankName} disabled={!canEdit} />
          <Field label="Account number" name="accountNumber" defaultValue={values.accountNumber} error={state?.errors?.accountNumber?.[0]} disabled={!canEdit} />
          <Field label="IFSC" name="ifsc" defaultValue={values.ifsc} error={state?.errors?.ifsc?.[0]} disabled={!canEdit} />
          <Field label="Bank branch" name="bankBranchName" defaultValue={values.bankBranchName} disabled={!canEdit} />
        </CardContent>
      </Card>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {employeeId ? "Save employee" : "Create employee"}
        </Button>
      ) : (
        <p className="text-sm text-slate-500">You have view-only access to this employee.</p>
      )}
    </form>
  );
}
