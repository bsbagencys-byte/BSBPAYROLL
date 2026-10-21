"use client";

import { useActionState } from "react";
import { createWebhookAction, rotateWebhookAction } from "@/actions/developers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEBHOOK_EVENT_TYPES } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult<{ secret: string }> = { success: false };

export function WebhookForm() {
  const [state, action, pending] = useActionState(createWebhookAction, initial);
  const [rotateState, rotateAction, rotatePending] = useActionState(rotateWebhookAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New endpoint</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          {state.data?.secret ? (
            <p className="break-all rounded-md bg-slate-100 p-2 text-xs">Secret (copy now): {state.data.secret}</p>
          ) : null}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="url">HTTPS URL</Label>
            <Input id="url" name="url" className="mt-1" placeholder="https://example.com/hooks/bsb" required />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Events</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {WEBHOOK_EVENT_TYPES.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="eventTypes" value={item} />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={pending}>
            Create webhook
          </Button>
        </form>
        {rotateState.message ? <p className="mt-3 text-sm">{rotateState.message}</p> : null}
        {rotateState.data?.secret ? (
          <p className="mt-2 break-all rounded-md bg-slate-100 p-2 text-xs">Rotated secret: {rotateState.data.secret}</p>
        ) : null}
        <form action={rotateAction} className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="rotateId">Rotate secret for endpoint id</Label>
            <Input id="rotateId" name="id" className="mt-1" />
          </div>
          <Button type="submit" variant="outline" disabled={rotatePending}>
            Rotate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
