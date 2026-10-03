"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveLoanTypeAction } from "@/actions/loans";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  LOAN_CATEGORIES,
  LOAN_CATEGORY_LABELS,
  LOAN_INTEREST_METHODS,
  LOAN_INTEREST_METHOD_LABELS,
  LOAN_WORKFLOW_MODES,
  LOAN_WORKFLOW_MODE_LABELS,
} from "@/lib/constants";
import type { ActionResult, LoanType } from "@/types";

const initial: ActionResult = { success: false };

export function LoanTypeForm({ row }: { row?: LoanType }) {
  const [state, action, pending] = useActionState(saveLoanTypeAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add loan type"}</CardTitle>
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
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={row?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" className="mt-1" defaultValue={row?.code} required />
            <FieldError>{state.errors?.code?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" className="mt-1" defaultValue={row?.category ?? "EMPLOYEE_LOAN"}>
              {LOAN_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {LOAN_CATEGORY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="workflowMode">Workflow</Label>
            <Select id="workflowMode" name="workflowMode" className="mt-1" defaultValue={row?.workflow_mode ?? "TWO_STEP"}>
              {LOAN_WORKFLOW_MODES.map((item) => (
                <option key={item} value={item}>
                  {LOAN_WORKFLOW_MODE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="interestMethod">Interest method</Label>
            <Select id="interestMethod" name="interestMethod" className="mt-1" defaultValue={row?.interest_method ?? "NONE"}>
              {LOAN_INTEREST_METHODS.map((item) => (
                <option key={item} value={item}>
                  {LOAN_INTEREST_METHOD_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="interestRate">Interest rate % p.a.</Label>
            <Input id="interestRate" name="interestRate" className="mt-1" defaultValue={row?.interest_rate ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxAmount">Maximum amount</Label>
            <Input id="maxAmount" name="maxAmount" className="mt-1" defaultValue={row?.max_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxTenureMonths">Maximum tenure (months)</Label>
            <Input id="maxTenureMonths" name="maxTenureMonths" className="mt-1" defaultValue={row?.max_tenure_months ?? ""} />
          </div>
          <div>
            <Label htmlFor="processingFee">Processing fee</Label>
            <Input id="processingFee" name="processingFee" className="mt-1" defaultValue={row?.processing_fee ?? ""} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="eligibility">Eligibility</Label>
            <Input id="eligibility" name="eligibility" className="mt-1" defaultValue={row?.eligibility ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" className="mt-1" defaultValue={row?.description ?? ""} />
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="allowMultipleActive" defaultChecked={row?.allow_multiple_active ?? false} className="h-4 w-4 rounded border-slate-300" />
              Allow multiple active loans
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="autoDeductPayroll" defaultChecked={row?.auto_deduct_payroll ?? true} className="h-4 w-4 rounded border-slate-300" />
              Auto-deduct EMI in payroll
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Update type" : "Save type"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
