"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveInvoiceAction } from "@/actions/exits";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult, Contractor, ContractorEngagement, ContractorInvoice } from "@/types";

const initial: ActionResult<{ invoiceId: string }> = { success: false };

export function InvoiceForm({
  contractors,
  engagements,
  row,
}: {
  contractors: Contractor[];
  engagements: ContractorEngagement[];
  row?: ContractorInvoice;
}) {
  const [state, action, pending] = useActionState(saveInvoiceAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.invoice_number}` : "New contractor invoice"}</CardTitle>
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
          <div>
            <Label htmlFor="engagementId">Engagement</Label>
            <Select id="engagementId" name="engagementId" className="mt-1" defaultValue={row?.engagement_id ?? ""}>
              <option value="">None</option>
              {engagements.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.reference_number} · {item.scope}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="invoiceNumber">Invoice number</Label>
            <Input id="invoiceNumber" name="invoiceNumber" className="mt-1" defaultValue={row?.invoice_number ?? ""} required />
          </div>
          <div>
            <Label htmlFor="invoiceDate">Invoice date</Label>
            <Input id="invoiceDate" name="invoiceDate" type="date" className="mt-1" defaultValue={row?.invoice_date ?? ""} required />
          </div>
          <div>
            <Label htmlFor="serviceFrom">Service from</Label>
            <Input id="serviceFrom" name="serviceFrom" type="date" className="mt-1" defaultValue={row?.service_from ?? ""} required />
          </div>
          <div>
            <Label htmlFor="serviceTo">Service to</Label>
            <Input id="serviceTo" name="serviceTo" type="date" className="mt-1" defaultValue={row?.service_to ?? ""} required />
          </div>
          <div>
            <Label htmlFor="grossAmount">Gross amount</Label>
            <Input id="grossAmount" name="grossAmount" className="mt-1" defaultValue={row?.gross_amount ?? ""} required />
          </div>
          <div>
            <Label htmlFor="adjustmentAmount">Adjustment</Label>
            <Input id="adjustmentAmount" name="adjustmentAmount" className="mt-1" defaultValue={row?.adjustment_amount ?? 0} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="duplicateOverrideReason">Duplicate override reason</Label>
            <Input id="duplicateOverrideReason" name="duplicateOverrideReason" className="mt-1" />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button type="submit" name="submit" value="true" variant="secondary" disabled={pending}>
              Save and submit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
