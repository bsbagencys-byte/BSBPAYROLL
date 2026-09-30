"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { previewFormulaAction, saveSalaryComponentAction } from "@/actions/salary";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SALARY_CALCULATION_METHODS,
  SALARY_CALCULATION_METHOD_LABELS,
  SALARY_COMPONENT_CATEGORIES,
  SALARY_COMPONENT_CATEGORY_LABELS,
  SALARY_COMPONENT_TYPES,
  SALARY_COMPONENT_TYPE_LABELS,
  SALARY_FREQUENCIES,
  SALARY_FREQUENCY_LABELS,
} from "@/lib/constants";
import type { ActionResult, SalaryComponent } from "@/types";

const initial: ActionResult = { success: false };
const previewInitial: ActionResult<{ value: number }> = { success: false };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

export function SalaryComponentForm({ row, components }: { row?: SalaryComponent; components: SalaryComponent[] }) {
  const [state, action, pending] = useActionState(saveSalaryComponentAction, initial);
  const [preview, previewAction, previewPending] = useActionState(previewFormulaAction, previewInitial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add salary component"}</CardTitle>
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
            <Label htmlFor="componentType">Type</Label>
            <Select id="componentType" name="componentType" className="mt-1" defaultValue={row?.component_type ?? "EARNING"}>
              {SALARY_COMPONENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {SALARY_COMPONENT_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" className="mt-1" defaultValue={row?.category ?? "ALLOWANCE"}>
              {SALARY_COMPONENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {SALARY_COMPONENT_CATEGORY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="calculationMethod">Calculation</Label>
            <Select id="calculationMethod" name="calculationMethod" className="mt-1" defaultValue={row?.calculation_method ?? "FIXED"}>
              {SALARY_CALCULATION_METHODS.map((item) => (
                <option key={item} value={item}>
                  {SALARY_CALCULATION_METHOD_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" name="frequency" className="mt-1" defaultValue={row?.frequency ?? "MONTHLY"}>
              {SALARY_FREQUENCIES.map((item) => (
                <option key={item} value={item}>
                  {SALARY_FREQUENCY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fixedAmount">Fixed amount</Label>
            <Input id="fixedAmount" name="fixedAmount" className="mt-1" defaultValue={row?.fixed_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="percentage">Percentage</Label>
            <Input id="percentage" name="percentage" className="mt-1" defaultValue={row?.percentage ?? ""} />
          </div>
          <div>
            <Label htmlFor="baseComponentId">Base component</Label>
            <Select id="baseComponentId" name="baseComponentId" className="mt-1" defaultValue={row?.base_component_id ?? ""}>
              <option value="">None / CTC</option>
              {components.filter((item) => item.id !== row?.id).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input id="sortOrder" name="sortOrder" className="mt-1" defaultValue={row?.sort_order ?? 10} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="formula">Formula</Label>
            <Input id="formula" name="formula" className="mt-1" defaultValue={row?.formula ?? ""} placeholder="BASIC * 0.40" />
            <FieldError>{state.errors?.formula?.[0]}</FieldError>
            <p className="mt-1 text-xs text-slate-500">Allowed tokens: BASIC HRA DA TA GROSS CTC WORKING_DAYS PRESENT_DAYS LOP_DAYS OT_HOURS, numbers and + - * / ( )</p>
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Check name="taxable" label="Taxable" defaultChecked={row?.taxable ?? true} />
            <Check name="includeInCtc" label="Include in CTC" defaultChecked={row?.include_in_ctc ?? true} />
            <Check name="includeInGross" label="Include in Gross" defaultChecked={row?.include_in_gross ?? true} />
            <Check name="variable" label="Variable / payroll input" defaultChecked={row?.variable} />
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={row?.effective_from ?? ""} />
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
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save component" : "Create component"}
            </Button>
          </div>
        </form>
        <form action={previewAction} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="previewFormula">Formula preview</Label>
            <Input id="previewFormula" name="formula" className="mt-1" defaultValue={row?.formula ?? "BASIC * 0.40"} />
          </div>
          <Button type="submit" variant="outline" disabled={previewPending}>
            {previewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Validate
          </Button>
        </form>
        {preview.message ? <p className={`mt-2 text-sm ${preview.success ? "text-emerald-700" : "text-red-700"}`}>{preview.message}</p> : null}
      </CardContent>
    </Card>
  );
}
