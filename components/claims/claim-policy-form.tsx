"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveClaimPolicyAction } from "@/actions/claims";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CITY_CATEGORIES,
  CITY_CATEGORY_LABELS,
  CLAIM_WORKFLOW_MODES,
  CLAIM_WORKFLOW_MODE_LABELS,
  TRAVEL_TYPES,
  TRAVEL_TYPE_LABELS,
} from "@/lib/constants";
import type { ActionResult, ClaimPolicy, ClaimType, Designation } from "@/types";

const initial: ActionResult = { success: false };

export function ClaimPolicyForm({
  row,
  types,
  designations,
}: {
  row?: ClaimPolicy;
  types: ClaimType[];
  designations: Designation[];
}) {
  const [state, action, pending] = useActionState(saveClaimPolicyAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add claim policy"}</CardTitle>
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
            <Label htmlFor="claimTypeId">Claim type</Label>
            <Select id="claimTypeId" name="claimTypeId" className="mt-1" defaultValue={row?.claim_type_id ?? ""}>
              <option value="">Any claim type</option>
              {types.map((item) => (
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
            <Label htmlFor="employeeCategory">Employee category</Label>
            <Input id="employeeCategory" name="employeeCategory" className="mt-1" defaultValue={row?.employee_category ?? ""} />
          </div>
          <div>
            <Label htmlFor="cityCategory">City category</Label>
            <Select id="cityCategory" name="cityCategory" className="mt-1" defaultValue={row?.city_category ?? ""}>
              <option value="">Any</option>
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
              <option value="">Any</option>
              {TRAVEL_TYPES.map((item) => (
                <option key={item} value={item}>
                  {TRAVEL_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="daPerDay">DA per day</Label>
            <Input id="daPerDay" name="daPerDay" className="mt-1" defaultValue={row?.da_per_day ?? ""} />
          </div>
          <div>
            <Label htmlFor="mileageRate">Mileage rate / km</Label>
            <Input id="mileageRate" name="mileageRate" className="mt-1" defaultValue={row?.mileage_rate ?? ""} />
          </div>
          <div>
            <Label htmlFor="localConveyanceLimit">Local conveyance limit</Label>
            <Input id="localConveyanceLimit" name="localConveyanceLimit" className="mt-1" defaultValue={row?.local_conveyance_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="hotelLimit">Hotel limit</Label>
            <Input id="hotelLimit" name="hotelLimit" className="mt-1" defaultValue={row?.hotel_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="mealLimit">Meal limit</Label>
            <Input id="mealLimit" name="mealLimit" className="mt-1" defaultValue={row?.meal_limit ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxAmount">Maximum amount</Label>
            <Input id="maxAmount" name="maxAmount" className="mt-1" defaultValue={row?.max_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="maxDays">Maximum days</Label>
            <Input id="maxDays" name="maxDays" className="mt-1" defaultValue={row?.max_days ?? ""} />
          </div>
          <div>
            <Label htmlFor="workflowMode">Workflow</Label>
            <Select id="workflowMode" name="workflowMode" className="mt-1" defaultValue={row?.workflow_mode ?? "TWO_STEP"}>
              {CLAIM_WORKFLOW_MODES.map((item) => (
                <option key={item} value={item}>
                  {CLAIM_WORKFLOW_MODE_LABELS[item]}
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
          <label className="flex items-center gap-2 self-end text-sm text-slate-700">
            <input type="checkbox" name="requireReceipt" defaultChecked={row?.require_receipt ?? true} className="h-4 w-4 rounded border-slate-300" />
            Require receipt
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save policy" : "Create policy"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
