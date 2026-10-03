"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveLoanApplicationAction } from "@/actions/loans";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { quoteLoan } from "@/lib/loans/engine";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { ActionResult, Employee, LoanApplication, LoanType } from "@/types";

const initial: ActionResult<{ applicationId: string }> = { success: false };

export function LoanApplicationForm({
  row,
  types,
  employees,
  lockedEmployeeId,
}: {
  row?: LoanApplication;
  types: LoanType[];
  employees: Employee[];
  lockedEmployeeId?: string | null;
}) {
  const [state, action, pending] = useActionState(saveLoanApplicationAction, initial);
  const [loanTypeId, setLoanTypeId] = useState(row?.loan_type_id ?? "");
  const [amount, setAmount] = useState(String(row?.requested_amount ?? ""));
  const [tenure, setTenure] = useState(String(row?.tenure_months ?? ""));
  const [rate, setRate] = useState(String(row?.interest_rate ?? ""));
  const [requestedDate, setRequestedDate] = useState(row?.requested_date ?? "");
  const selectedType = types.find((item) => item.id === loanTypeId) ?? null;
  const preview = useMemo(() => {
    const principal = Number(amount);
    const months = Number(tenure);
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(months) || months < 1 || !requestedDate) return null;
    return quoteLoan({
      principal,
      tenureMonths: months,
      interestMethod: selectedType?.interest_method ?? "NONE",
      interestRate: rate ? Number(rate) : selectedType?.interest_rate ?? null,
      startDate: requestedDate,
    });
  }, [amount, tenure, rate, requestedDate, selectedType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.reference_number ?? "application"}` : "New loan application"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          {lockedEmployeeId ? <input type="hidden" name="employeeId" value={lockedEmployeeId} /> : null}
          {!lockedEmployeeId ? (
            <div>
              <Label htmlFor="employeeId">Employee</Label>
              <Select id="employeeId" name="employeeId" className="mt-1" defaultValue={row?.employee_id ?? ""} required>
                <option value="">Select employee</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name} ({item.employee_code})
                  </option>
                ))}
              </Select>
              <FieldError>{state.errors?.employeeId?.[0]}</FieldError>
            </div>
          ) : null}
          <div>
            <Label htmlFor="loanTypeId">Loan type</Label>
            <Select
              id="loanTypeId"
              name="loanTypeId"
              className="mt-1"
              value={loanTypeId}
              onChange={(event) => {
                setLoanTypeId(event.target.value);
                const next = types.find((item) => item.id === event.target.value);
                if (next?.interest_rate != null) setRate(String(next.interest_rate));
              }}
              required
            >
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
            <Label htmlFor="requestedAmount">Requested amount</Label>
            <Input id="requestedAmount" name="requestedAmount" className="mt-1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <FieldError>{state.errors?.requestedAmount?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="tenureMonths">Tenure (months)</Label>
            <Input id="tenureMonths" name="tenureMonths" className="mt-1" value={tenure} onChange={(event) => setTenure(event.target.value)} required />
            <FieldError>{state.errors?.tenureMonths?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="interestRate">Interest rate % p.a.</Label>
            <Input
              id="interestRate"
              name="interestRate"
              className="mt-1"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              readOnly={selectedType?.interest_method === "NONE"}
            />
          </div>
          <div>
            <Label htmlFor="requestedDate">Requested date</Label>
            <Input id="requestedDate" name="requestedDate" type="date" className="mt-1" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} required />
            <FieldError>{state.errors?.requestedDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="purpose">Purpose</Label>
            <Input id="purpose" name="purpose" className="mt-1" defaultValue={row?.purpose ?? ""} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" defaultValue={row?.notes ?? ""} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="autoDeductPayroll" defaultChecked={row?.auto_deduct_payroll ?? true} className="h-4 w-4 rounded border-slate-300" />
              Deduct EMI automatically in payroll
            </label>
          </div>
          {preview ? (
            <div className="md:col-span-2 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
              <Preview label="Principal" value={formatCurrency(preview.principal)} />
              <Preview label="Interest" value={formatCurrency(preview.interestAmount)} />
              <Preview label="Total repayment" value={formatCurrency(preview.totalRepayment)} />
              <Preview label="EMI" value={formatCurrency(preview.emiAmount)} />
              <Preview label="First due" value={formatDateOnly(preview.firstDueDate)} />
              <Preview label="Last due" value={formatDateOnly(preview.lastDueDate)} />
            </div>
          ) : (
            <p className="md:col-span-2 text-sm text-slate-500">Enter amount, tenure and date to preview EMI.</p>
          )}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" name="submit" value="" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button type="submit" name="submit" value="on" disabled={pending}>
              Submit for approval
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
