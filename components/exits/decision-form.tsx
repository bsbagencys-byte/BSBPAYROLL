import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideExitAction } from "@/actions/exits";

export function ExitDecisionForm({ exitId, canApprove }: { exitId: string; canApprove: boolean }) {
  if (!canApprove) {
    return <p className="text-sm text-slate-500">You do not have permission to decide this exit.</p>;
  }
  return (
    <form action={decideExitAction} className="grid gap-3">
      <input type="hidden" name="exitId" value={exitId} />
      <div>
        <Label htmlFor="reason">Reason / comment</Label>
        <Input id="reason" name="reason" className="mt-1" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="APPROVED">
          Approve
        </Button>
        <Button type="submit" name="decision" value="REJECTED" variant="destructive">
          Return
        </Button>
      </div>
    </form>
  );
}
