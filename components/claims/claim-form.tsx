"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveClaimAction } from "@/actions/claims";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CITY_CATEGORIES,
  CITY_CATEGORY_LABELS,
  TRAVEL_MODES,
  TRAVEL_MODE_LABELS,
  TRAVEL_TYPES,
  TRAVEL_TYPE_LABELS,
} from "@/lib/constants";
import type { ActionResult, Claim, ClaimType, Employee } from "@/types";

const initial: ActionResult<{ claimId: string }> = { success: false };

export function ClaimForm({
  row,
  types,
  employees,
  lockedEmployeeId,
}: {
  row?: Claim;
  types: ClaimType[];
  employees: Employee[];
  lockedEmployeeId?: string | null;
}) {
  const [state, action, pending] = useActionState(saveClaimAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit claim ${row.reference_number ?? ""}` : "Raise a claim"}</CardTitle>
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
            <Label htmlFor="claimTypeId">Claim type</Label>
            <Select id="claimTypeId" name="claimTypeId" className="mt-1" defaultValue={row?.claim_type_id ?? ""} required>
              <option value="">Select claim type</option>
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.claimTypeId?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="claimDate">Claim date</Label>
            <Input id="claimDate" name="claimDate" type="date" className="mt-1" defaultValue={row?.claim_date} required />
            <FieldError>{state.errors?.claimDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="amount">Amount claimed</Label>
            <Input id="amount" name="amount" className="mt-1" defaultValue={row?.submitted_amount || ""} />
          </div>
          <div>
            <Label htmlFor="periodFrom">Period from</Label>
            <Input id="periodFrom" name="periodFrom" type="date" className="mt-1" defaultValue={row?.period_from ?? ""} />
          </div>
          <div>
            <Label htmlFor="periodTo">Period to</Label>
            <Input id="periodTo" name="periodTo" type="date" className="mt-1" defaultValue={row?.period_to ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input id="purpose" name="purpose" className="mt-1" defaultValue={row?.purpose ?? ""} />
          </div>
          <div>
            <Label htmlFor="distance">Distance (km)</Label>
            <Input id="distance" name="distance" className="mt-1" defaultValue={row?.distance ?? ""} />
          </div>
          <div>
            <Label htmlFor="ratePerKm">Rate per km</Label>
            <Input id="ratePerKm" name="ratePerKm" className="mt-1" defaultValue={row?.rate_per_km ?? ""} />
          </div>
          <div>
            <Label htmlFor="travelMode">Travel mode</Label>
            <Select id="travelMode" name="travelMode" className="mt-1" defaultValue={row?.travel_mode ?? ""}>
              <option value="">Not applicable</option>
              {TRAVEL_MODES.map((item) => (
                <option key={item} value={item}>
                  {TRAVEL_MODE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="travelDays">Travel days</Label>
            <Input id="travelDays" name="travelDays" className="mt-1" defaultValue={row?.travel_days ?? ""} />
          </div>
          <div>
            <Label htmlFor="cityCategory">City category</Label>
            <Select id="cityCategory" name="cityCategory" className="mt-1" defaultValue={row?.city_category ?? ""}>
              <option value="">Not applicable</option>
              {CITY_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CITY_CATEGORY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="travelType">Travel type</Label>
            <Select id="travelType" name="travelType" className="mt-1" defaultValue={row?.travel_type ?? ""}>
              <option value="">Not applicable</option>
              {TRAVEL_TYPES.map((item) => (
                <option key={item} value={item}>
                  {TRAVEL_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="referenceNumber">Reference</Label>
            <Input id="referenceNumber" name="referenceNumber" className="mt-1" defaultValue={row?.reference_number ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" defaultValue={row?.notes ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="includeInPayroll" defaultChecked={row?.include_in_payroll ?? true} className="h-4 w-4 rounded border-slate-300" />
            Include in payroll when approved
          </label>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2">
            <Button type="submit" name="submit" value="" variant="outline" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button type="submit" name="submit" value="on" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit for approval
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
