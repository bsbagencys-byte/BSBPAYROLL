"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveMappingAction } from "@/actions/accounting";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PAYROLL_MAPPING_CATEGORIES, PAYROLL_MAPPING_CATEGORY_LABELS } from "@/lib/constants";
import type { AccountingAccount, ActionResult, Branch, Department, PayrollAccountMapping } from "@/types";

const initial: ActionResult = { success: false };

export function MappingForm({
  accounts,
  branches,
  departments,
  mapping,
}: {
  accounts: AccountingAccount[];
  branches: Branch[];
  departments: Department[];
  mapping?: PayrollAccountMapping | null;
}) {
  const [state, action, pending] = useActionState(saveMappingAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mapping ? "Edit mapping" : "New payroll mapping"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          {mapping ? <input type="hidden" name="id" value={mapping.id} /> : null}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" className="mt-1" defaultValue={mapping?.category ?? "EARNING"}>
              {PAYROLL_MAPPING_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {PAYROLL_MAPPING_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="componentCode">Component code</Label>
            <Input id="componentCode" name="componentCode" className="mt-1" defaultValue={mapping?.component_code ?? ""} placeholder="Optional, e.g. BASIC" />
          </div>
          <div>
            <Label htmlFor="ledgerAccountId">Ledger account</Label>
            <Select id="ledgerAccountId" name="ledgerAccountId" className="mt-1" defaultValue={mapping?.ledger_account_id ?? ""} required>
              <option value="">Select account</option>
              {accounts.filter((row) => row.status === "ACTIVE").map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} · {row.name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.ledgerAccountId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="treatment">Treatment</Label>
            <Select id="treatment" name="treatment" className="mt-1" defaultValue={mapping?.treatment ?? "DEBIT"}>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select id="branchId" name="branchId" className="mt-1" defaultValue={mapping?.branch_id ?? ""}>
              <option value="">All branches</option>
              {branches.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="departmentId">Department</Label>
            <Select id="departmentId" name="departmentId" className="mt-1" defaultValue={mapping?.department_id ?? ""}>
              <option value="">All departments</option>
              {departments.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={mapping?.effective_from} required />
            <FieldError>{state.errors?.effectiveFrom?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="effectiveTo">Effective to</Label>
            <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" defaultValue={mapping?.effective_to ?? ""} />
          </div>
          <div className="flex items-center gap-2">
            <input id="active" name="active" type="checkbox" defaultChecked={mapping?.active ?? true} value="on" />
            <Label htmlFor="active">Active</Label>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" defaultValue={mapping?.notes ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save mapping
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
