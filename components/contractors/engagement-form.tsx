"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveEngagementAction } from "@/actions/exits";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ENGAGEMENT_FREQUENCIES,
  ENGAGEMENT_FREQUENCY_LABELS,
  ENGAGEMENT_RATE_UNITS,
  ENGAGEMENT_RATE_UNIT_LABELS,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_STATUS_LABELS,
} from "@/lib/constants";
import type { ActionResult, Contractor, ContractorEngagement } from "@/types";

const initial: ActionResult<{ engagementId: string }> = { success: false };

export function EngagementForm({ contractors, row, lockedContractorId }: { contractors: Contractor[]; row?: ContractorEngagement; lockedContractorId?: string }) {
  const [state, action, pending] = useActionState(saveEngagementAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? "Edit engagement" : "New engagement"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          {lockedContractorId ? <input type="hidden" name="contractorId" value={lockedContractorId} /> : null}
          {!lockedContractorId ? (
            <div>
              <Label htmlFor="contractorId">Contractor</Label>
              <Select id="contractorId" name="contractorId" className="mt-1" defaultValue={row?.contractor_id ?? ""} required>
                <option value="">Select contractor</option>
                {contractors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name} ({item.contractor_code})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className={lockedContractorId ? "md:col-span-2" : ""}>
            <Label htmlFor="scope">Scope</Label>
            <Input id="scope" name="scope" className="mt-1" defaultValue={row?.scope ?? ""} required />
          </div>
          <div>
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" className="mt-1" defaultValue={row?.start_date ?? ""} required />
          </div>
          <div>
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" name="endDate" type="date" className="mt-1" defaultValue={row?.end_date ?? ""} />
          </div>
          <div>
            <Label htmlFor="feeAmount">Fee / rate</Label>
            <Input id="feeAmount" name="feeAmount" className="mt-1" defaultValue={row?.fee_amount ?? ""} required />
          </div>
          <div>
            <Label htmlFor="rateUnit">Rate unit</Label>
            <Select id="rateUnit" name="rateUnit" className="mt-1" defaultValue={row?.rate_unit ?? "MONTHLY"}>
              {ENGAGEMENT_RATE_UNITS.map((item) => (
                <option key={item} value={item}>
                  {ENGAGEMENT_RATE_UNIT_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="paymentFrequency">Payment frequency</Label>
            <Select id="paymentFrequency" name="paymentFrequency" className="mt-1" defaultValue={row?.payment_frequency ?? "MONTHLY"}>
              {ENGAGEMENT_FREQUENCIES.map((item) => (
                <option key={item} value={item}>
                  {ENGAGEMENT_FREQUENCY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              {ENGAGEMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {ENGAGEMENT_STATUS_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="invoiceTerms">Invoice terms</Label>
            <Input id="invoiceTerms" name="invoiceTerms" className="mt-1" defaultValue={row?.invoice_terms ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save engagement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
