"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveHolidayAction } from "@/actions/leave";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { HOLIDAY_TYPE_LABELS, HOLIDAY_TYPES } from "@/lib/constants";
import type { ActionResult, Branch, Holiday, Location } from "@/types";

const initial: ActionResult = { success: false };

export function HolidayForm({
  branches,
  locations,
  row,
}: {
  branches: Branch[];
  locations: Location[];
  row?: Holiday;
}) {
  const [state, action, pending] = useActionState(saveHolidayAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.name}` : "Add holiday"}</CardTitle>
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
            <Label htmlFor="holidayDate">Date</Label>
            <Input id="holidayDate" name="holidayDate" type="date" className="mt-1" defaultValue={row?.holiday_date} required />
          </div>
          <div>
            <Label htmlFor="holidayType">Type</Label>
            <Select id="holidayType" name="holidayType" className="mt-1" defaultValue={row?.holiday_type ?? "COMPANY"}>
              {HOLIDAY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {HOLIDAY_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="branchId">Branch (optional)</Label>
            <Select id="branchId" name="branchId" className="mt-1" defaultValue={row?.branch_id ?? ""}>
              <option value="">All branches</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="locationId">Location (optional)</Label>
            <Select id="locationId" name="locationId" className="mt-1" defaultValue={row?.location_id ?? ""}>
              <option value="">All locations</option>
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="optional" defaultChecked={row?.optional} className="h-4 w-4 rounded border-slate-300" />
            Optional holiday
          </label>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {row ? "Save holiday" : "Add holiday"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
