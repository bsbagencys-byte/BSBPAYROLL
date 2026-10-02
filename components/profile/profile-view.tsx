"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { changePasswordAction, logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, FieldError } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { ActionResult, SessionUser } from "@/types";

const initial: ActionResult = { success: false };

export function ProfileView({ user }: { user: SessionUser }) {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const [show, setShow] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-700 text-xl font-semibold text-white">
            {initials(user.displayName)}
          </div>
          <p className="text-xs text-slate-500">Photo upload is available on the employee profile documents tab.</p>
          <dl className="space-y-2 text-sm">
            <Row label="Display name" value={user.displayName} />
            <Row label="Username" value={user.username} />
            <Row label="Mobile" value={user.mobile ?? "—"} />
            <Row label="Role" value={user.roleName} />
            <Row label="Company" value={user.organization.display_name || user.organization.name} />
            <Row label="Branch" value={user.branch?.name ?? "Unassigned"} />
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Status</dt>
              <Badge variant={user.status === "ACTIVE" ? "success" : "danger"}>{user.status}</Badge>
            </div>
          </dl>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Min 8 characters, including a letter, number and special character.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {state?.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
            <div>
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" name="currentPassword" type={show ? "text" : "password"} className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">New password</Label>
              <div className="relative mt-1">
                <Input id="password" name="password" type={show ? "text" : "password"} required />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShow((v) => !v)}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError>{state?.errors?.password?.[0]}</FieldError>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" name="confirmPassword" type={show ? "text" : "password"} className="mt-1" required />
              <FieldError>{state?.errors?.confirmPassword?.[0]}</FieldError>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
