"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { uploadClaimAttachmentAction } from "@/actions/claims";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function ClaimAttachmentForm({ claimId, employeeId }: { claimId: string; employeeId: string }) {
  const [state, action, pending] = useActionState(uploadClaimAttachmentAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="claimId" value={claimId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <div>
        <Label htmlFor="file">Receipt (PDF or image, max 5MB)</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="mt-1 block w-full text-sm text-slate-700"
          required
        />
        <FieldError>{state.errors?.file?.[0]}</FieldError>
      </div>
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Upload receipt
        </Button>
      </div>
    </form>
  );
}
