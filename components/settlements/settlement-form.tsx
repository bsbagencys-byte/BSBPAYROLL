"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createSettlementAction } from "@/actions/exits";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult, ExitListItem } from "@/types";

const initial: ActionResult<{ settlementId: string }> = { success: false };

export function SettlementCreateForm({ exits }: { exits: ExitListItem[] }) {
  const [state, action, pending] = useActionState(createSettlementAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create settlement</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <div>
            <Label htmlFor="exitId">Ready exit</Label>
            <Select id="exitId" name="exitId" className="mt-1" required>
              <option value="">Select exit</option>
              {exits.map((item) => (
                <option key={item.exit.id} value={item.exit.id}>
                  {item.exit.reference_number} · {item.employeeName}
                </option>
              ))}
            </Select>
            <FieldError>{state.errors?.exitId?.[0]}</FieldError>
          </div>
          <Button type="submit" disabled={pending || exits.length === 0}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Calculate F&F
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
