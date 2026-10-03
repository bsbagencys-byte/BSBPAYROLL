import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideLoanAction } from "@/actions/loans";

export function LoanDecisionForm({
  applicationId,
  amount,
  tenure,
  canApprove,
}: {
  applicationId: string;
  amount: number;
  tenure: number;
  canApprove: boolean;
}) {
  if (!canApprove) {
    return <p className="text-sm text-slate-500">You do not have permission to decide this application.</p>;
  }
  return (
    <form action={decideLoanAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="amount">Approved amount</Label>
        <Input id="amount" name="amount" className="mt-1" defaultValue={amount} />
      </div>
      <div>
        <Label htmlFor="tenureMonths">Approved tenure</Label>
        <Input id="tenureMonths" name="tenureMonths" className="mt-1" defaultValue={tenure} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="reason">Reason / comment</Label>
        <Input id="reason" name="reason" className="mt-1" />
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" name="decision" value="APPROVED">
          Approve
        </Button>
        <Button type="submit" name="decision" value="REJECTED" variant="destructive">
          Reject
        </Button>
      </div>
    </form>
  );
}
