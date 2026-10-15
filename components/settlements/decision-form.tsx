import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideSettlementAction } from "@/actions/exits";

export function SettlementDecisionForm({ settlementId, canApprove }: { settlementId: string; canApprove: boolean }) {
  if (!canApprove) {
    return <p className="text-sm text-slate-500">You do not have permission to decide this settlement.</p>;
  }
  return (
    <form action={decideSettlementAction} className="grid gap-3">
      <input type="hidden" name="settlementId" value={settlementId} />
      <div>
        <Label htmlFor="reason">Reason / comment</Label>
        <Input id="reason" name="reason" className="mt-1" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="APPROVED">
          Approve
        </Button>
        <Button type="submit" name="decision" value="RETURNED" variant="outline">
          Return
        </Button>
        <Button type="submit" name="decision" value="REJECTED" variant="destructive">
          Reject
        </Button>
      </div>
    </form>
  );
}
