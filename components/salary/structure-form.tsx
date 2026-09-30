"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveSalaryStructureAction } from "@/actions/salary";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SALARY_CALCULATION_METHODS, SALARY_CALCULATION_METHOD_LABELS } from "@/lib/constants";
import type { ActionResult, SalaryComponent, SalaryStructure, SalaryStructureItem } from "@/types";

const initial: ActionResult = { success: false };

export function SalaryStructureForm({
  row,
  components,
  items = [],
}: {
  row?: SalaryStructure;
  components: SalaryComponent[];
  items?: SalaryStructureItem[];
}) {
  const [state, action, pending] = useActionState(saveSalaryStructureAction, initial);
  const selected = new Set(items.map((item) => item.component_id));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add salary structure"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <div className="grid gap-4 md:grid-cols-2">
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
              <Label htmlFor="ctcAmount">Template CTC</Label>
              <Input id="ctcAmount" name="ctcAmount" className="mt-1" defaultValue={row?.ctc_amount ?? ""} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="effectiveFrom">Effective from</Label>
              <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={row?.effective_from} required />
            </div>
            <div>
              <Label htmlFor="effectiveTo">Effective to</Label>
              <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" defaultValue={row?.effective_to ?? ""} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" className="mt-1" defaultValue={row?.description ?? ""} />
            </div>
          </div>
          <FieldError>{state.errors?.items?.[0]}</FieldError>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Use</th>
                  <th className="px-3 py-2">Component</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Fixed / %</th>
                  <th className="px-3 py-2">Formula</th>
                </tr>
              </thead>
              <tbody>
                {components.filter((item) => item.status === "ACTIVE").map((component) => {
                  const current = items.find((item) => item.component_id === component.id);
                  return (
                    <tr key={component.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <input type="checkbox" name="componentId" value={component.id} defaultChecked={selected.size ? selected.has(component.id) : !component.variable} />
                      </td>
                      <td className="px-3 py-2">
                        {component.name}
                        <div className="text-xs text-slate-500">{component.code}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Select name={`method_${component.id}`} defaultValue={current?.calculation_method ?? component.calculation_method}>
                          {SALARY_CALCULATION_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {SALARY_CALCULATION_METHOD_LABELS[method]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input name={`fixed_${component.id}`} defaultValue={current?.fixed_amount ?? component.fixed_amount ?? ""} placeholder="Fixed" />
                        <Input name={`pct_${component.id}`} className="mt-1" defaultValue={current?.percentage ?? component.percentage ?? ""} placeholder="%" />
                        <input type="hidden" name={`base_${component.id}`} value={current?.base_component_id ?? component.base_component_id ?? ""} />
                        <input type="hidden" name={`order_${component.id}`} value={current?.sort_order ?? component.sort_order} />
                        <input type="hidden" name={`ctc_${component.id}`} value={current?.include_in_ctc ?? component.include_in_ctc ? "on" : ""} />
                        <input type="hidden" name={`gross_${component.id}`} value={current?.include_in_gross ?? component.include_in_gross ? "on" : ""} />
                      </td>
                      <td className="px-3 py-2">
                        <Input name={`formula_${component.id}`} defaultValue={current?.formula ?? component.formula ?? ""} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save structure" : "Create structure"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
