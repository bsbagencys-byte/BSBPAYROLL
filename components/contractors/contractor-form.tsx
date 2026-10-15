"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveContractorAction } from "@/actions/exits";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CONTRACTOR_BUSINESS_TYPES, CONTRACTOR_BUSINESS_TYPE_LABELS, CONTRACTOR_STATUSES, CONTRACTOR_STATUS_LABELS } from "@/lib/constants";
import type { ActionResult, Contractor, Employee } from "@/types";

const initial: ActionResult<{ contractorId: string }> = { success: false };

export function ContractorForm({ row, employees }: { row?: Contractor; employees: Employee[] }) {
  const [state, action, pending] = useActionState(saveContractorAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.contractor_code}` : "New contractor"}</CardTitle>
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
            <Label htmlFor="contractorCode">Contractor ID</Label>
            <Input id="contractorCode" name="contractorCode" className="mt-1" defaultValue={row?.contractor_code ?? ""} required />
            <FieldError>{state.errors?.contractorCode?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="businessType">Business type</Label>
            <Select id="businessType" name="businessType" className="mt-1" defaultValue={row?.business_type ?? "INDIVIDUAL"}>
              {CONTRACTOR_BUSINESS_TYPES.map((item) => (
                <option key={item} value={item}>
                  {CONTRACTOR_BUSINESS_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" name="legalName" className="mt-1" defaultValue={row?.legal_name ?? ""} required />
          </div>
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" className="mt-1" defaultValue={row?.display_name ?? ""} required />
          </div>
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" name="pan" className="mt-1" defaultValue={row?.pan ?? ""} />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" name="gstin" className="mt-1" defaultValue={row?.gstin ?? ""} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" className="mt-1" defaultValue={row?.email ?? ""} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" className="mt-1" defaultValue={row?.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="bankName">Bank</Label>
            <Input id="bankName" name="bankName" className="mt-1" defaultValue={row?.bank_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="accountNumber">Account number</Label>
            <Input id="accountNumber" name="accountNumber" className="mt-1" defaultValue={row?.account_number ?? ""} />
          </div>
          <div>
            <Label htmlFor="ifsc">IFSC</Label>
            <Input id="ifsc" name="ifsc" className="mt-1" defaultValue={row?.ifsc ?? ""} />
          </div>
          <div>
            <Label htmlFor="reportingManagerId">Reporting manager</Label>
            <Select id="reportingManagerId" name="reportingManagerId" className="mt-1" defaultValue={row?.reporting_manager_id ?? ""}>
              <option value="">None</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name} ({item.employee_code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              {CONTRACTOR_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {CONTRACTOR_STATUS_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" defaultValue={row?.notes ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save contractor
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
