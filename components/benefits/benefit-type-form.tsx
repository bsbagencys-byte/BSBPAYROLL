"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveBenefitTypeAction } from "@/actions/claims";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  BENEFIT_CALCULATION_METHODS,
  BENEFIT_CALCULATION_METHOD_LABELS,
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_FREQUENCIES,
  BENEFIT_FREQUENCY_LABELS,
  BENEFIT_TAX_TREATMENTS,
  BENEFIT_TAX_TREATMENT_LABELS,
} from "@/lib/constants";
import type { ActionResult, BenefitType } from "@/types";

const initial: ActionResult = { success: false };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

export function BenefitTypeForm({ row }: { row?: BenefitType }) {
  const [state, action, pending] = useActionState(saveBenefitTypeAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add benefit type"}</CardTitle>
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
            <Select id="category" name="category" className="mt-1" defaultValue={row?.category ?? "FUEL"}>
              {BENEFIT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {BENEFIT_CATEGORY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="calculationMethod">Calculation</Label>
            <Select id="calculationMethod" name="calculationMethod" className="mt-1" defaultValue={row?.calculation_method ?? "FIXED"}>
              {BENEFIT_CALCULATION_METHODS.map((item) => (
                <option key={item} value={item}>
                  {BENEFIT_CALCULATION_METHOD_LABELS[item]}
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
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" name="frequency" className="mt-1" defaultValue={row?.frequency ?? "MONTHLY"}>
              {BENEFIT_FREQUENCIES.map((item) => (
                <option key={item} value={item}>
                  {BENEFIT_FREQUENCY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="taxTreatment">Tax treatment</Label>
            <Select id="taxTreatment" name="taxTreatment" className="mt-1" defaultValue={row?.tax_treatment ?? "UNSET"}>
              {BENEFIT_TAX_TREATMENTS.map((item) => (
                <option key={item} value={item}>
                  {BENEFIT_TAX_TREATMENT_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="eligibility">Eligibility</Label>
            <Input id="eligibility" name="eligibility" className="mt-1" defaultValue={row?.eligibility ?? ""} placeholder="e.g. Confirmed employees" />
          </div>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
            <Check name="includeInCtc" label="Include in CTC" defaultChecked={row?.include_in_ctc ?? false} />
            <Check name="includeInGross" label="Include in Gross" defaultChecked={row?.include_in_gross ?? false} />
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
              {row ? "Save benefit type" : "Create benefit type"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
