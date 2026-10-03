import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { disburseLoanAction } from "@/actions/loans";

export function LoanDisburseForm({ applicationId, startDate, canDisburse }: { applicationId: string; startDate: string; canDisburse: boolean }) {
  if (!canDisburse) return null;
  return (
    <form action={disburseLoanAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="startDate">Disbursement / start date</Label>
        <Input id="startDate" name="startDate" type="date" className="mt-1" defaultValue={startDate} required />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" className="mt-1" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit">Disburse and create loan account</Button>
      </div>
    </form>
  );
}
