"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveStatutoryRuleAction } from "@/actions/payroll";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { STATUTORY_HEADS, STATUTORY_HEAD_LABELS } from "@/lib/constants";
import type { ActionResult, StatutoryRule } from "@/types";

const initial: ActionResult = { success: false };

export function StatutoryRuleForm({ row }: { row?: StatutoryRule }) {
  const [state, action, pending] = useActionState(saveStatutoryRuleAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add statutory rule"}</CardTitle>
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
            <Label htmlFor="head">Head</Label>
            <Select id="head" name="head" className="mt-1" defaultValue={row?.head ?? "PF"}>
              {STATUTORY_HEADS.map((item) => (
                <option key={item} value={item}>
                  {STATUTORY_HEAD_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={row?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="employeeRate">Employee rate %</Label>
            <Input id="employeeRate" name="employeeRate" className="mt-1" defaultValue={row?.employee_rate ?? ""} />
          </div>
          <div>
            <Label htmlFor="employerRate">Employer rate %</Label>
            <Input id="employerRate" name="employerRate" className="mt-1" defaultValue={row?.employer_rate ?? ""} />
          </div>
          <div>
            <Label htmlFor="wageCeiling">Wage ceiling</Label>
            <Input id="wageCeiling" name="wageCeiling" className="mt-1" defaultValue={row?.wage_ceiling ?? ""} />
          </div>
          <div>
            <Label htmlFor="minWage">Min wage</Label>
            <Input id="minWage" name="minWage" className="mt-1" defaultValue={row?.min_wage ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxWage">Max wage</Label>
            <Input id="maxWage" name="maxWage" className="mt-1" defaultValue={row?.max_wage ?? ""} />
          </div>
          <div>
            <Label htmlFor="fixedAmount">Fixed amount</Label>
            <Input id="fixedAmount" name="fixedAmount" className="mt-1" defaultValue={row?.fixed_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="stateCode">State code</Label>
            <Input id="stateCode" name="stateCode" className="mt-1" defaultValue={row?.state_code ?? ""} />
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={row?.effective_from} required />
          </div>
          <div>
            <Label htmlFor="effectiveTo">Effective to</Label>
            <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" defaultValue={row?.effective_to ?? ""} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save rule
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
