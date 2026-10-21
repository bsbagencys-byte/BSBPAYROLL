"use client";

import { useActionState } from "react";
import { createApiKeyAction, rotateApiKeyAction } from "@/actions/developers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_SCOPES, API_SCOPE_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult<{ plaintext: string }> = { success: false };

export function ApiKeyForm() {
  const [state, action, pending] = useActionState(createApiKeyAction, initial);
  const [rotateState, rotateAction, rotatePending] = useActionState(rotateApiKeyAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New API key</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          {state.data?.plaintext ? (
            <p className="break-all rounded-md bg-slate-100 p-2 text-xs">Key (copy now): {state.data.plaintext}</p>
          ) : null}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" required />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Scopes</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {API_SCOPES.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="scopes" value={item} />
                  {API_SCOPE_LABELS[item]}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor="expiresAt">Expires (optional)</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" className="mt-1" />
          </div>
          <Button type="submit" disabled={pending}>
            Create key
          </Button>
        </form>
        {rotateState.data?.plaintext ? (
          <p className="mt-3 break-all rounded-md bg-slate-100 p-2 text-xs">Rotated key: {rotateState.data.plaintext}</p>
        ) : null}
        <form action={rotateAction} className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="rotateKeyId">Rotate key id</Label>
            <Input id="rotateKeyId" name="id" className="mt-1" />
          </div>
          <Button type="submit" variant="outline" disabled={rotatePending}>
            Rotate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
