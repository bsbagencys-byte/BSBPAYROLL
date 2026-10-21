"use client";

import { useActionState } from "react";
import { saveTemplateAction } from "@/actions/notifications";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AUTOMATION_EVENT_TYPES, AUTOMATION_EVENT_TYPE_LABELS, TEMPLATE_VARIABLES } from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function TemplateForm() {
  const [state, action, pending] = useActionState(saveTemplateAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New or replace template</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="key">Key</Label>
            <Input id="key" name="key" className="mt-1" required />
            <FieldError>{state.errors?.key?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="eventType">Event</Label>
            <Select id="eventType" name="eventType" className="mt-1" required>
              {AUTOMATION_EVENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {AUTOMATION_EVENT_TYPE_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="channel">Channel</Label>
            <Select id="channel" name="channel" className="mt-1" defaultValue="EMAIL">
              <option value="EMAIL">Email</option>
              <option value="IN_APP">In-app</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" className="mt-1" required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="bodyText">Body</Label>
            <textarea id="bodyText" name="bodyText" className="mt-1 min-h-24 w-full rounded-md border border-slate-200 p-2 text-sm" required />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              Save template
            </Button>
            <p className="mt-2 text-xs text-slate-500">Variables: {TEMPLATE_VARIABLES.map((item) => `{{${item}}}`).join(", ")}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
