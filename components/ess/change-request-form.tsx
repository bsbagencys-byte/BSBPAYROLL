"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { submitChangeRequestAction } from "@/actions/ess";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ESS_CHANGE_CATEGORIES, ESS_CHANGE_CATEGORY_LABELS, ESS_SENSITIVE_CATEGORIES } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult<{ requestId: string }> = { success: false };

export function ChangeRequestForm({ canSubmit }: { canSubmit: boolean }) {
  const [state, action, pending] = useActionState(submitChangeRequestAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a profile change</CardTitle>
      </CardHeader>
      <CardContent>
        {!canSubmit ? (
          <p className="text-sm text-slate-500">You do not have permission to request profile changes.</p>
        ) : (
          <form action={action} className="grid gap-4">
            {state.message ? (
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select id="category" name="category" className="mt-1" defaultValue="CONTACT" required>
                  {ESS_CHANGE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {ESS_CHANGE_CATEGORY_LABELS[item]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="fieldKey">Field</Label>
                <Input id="fieldKey" name="fieldKey" className="mt-1" placeholder="e.g. mobile or bank.account_number" required />
                <FieldError>{state.errors?.fieldKey?.[0]}</FieldError>
              </div>
              <div>
                <Label htmlFor="currentValue">Current value (optional)</Label>
                <Input id="currentValue" name="currentValue" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="requestedValue">Corrected value</Label>
                <Input id="requestedValue" name="requestedValue" className="mt-1" required />
                <FieldError>{state.errors?.requestedValue?.[0]}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason / supporting note</Label>
              <Input id="reason" name="reason" className="mt-1" />
            </div>
            <p className="text-xs text-slate-500">
              Bank and statutory identifier changes ({ESS_SENSITIVE_CATEGORIES.map((item) => ESS_CHANGE_CATEGORY_LABELS[item]).join(", ")}) are
              never applied automatically and require authorised review.
            </p>
            <div>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit for review
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
