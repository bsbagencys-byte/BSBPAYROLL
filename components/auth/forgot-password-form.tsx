"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { forgotPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, FieldError } from "@/components/ui/alert";
import type { ActionResult } from "@/types";

const initialState: ActionResult = { success: false };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);
  const demo = state?.data as { demoToken?: string; username?: string } | undefined;

  return (
    <form action={action} className="space-y-4">
      {state?.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" className="mt-1" required />
        <FieldError>{state?.errors?.username?.[0]}</FieldError>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Send reset instructions
      </Button>
      {demo?.demoToken ? (
        <Alert variant="info">
          Demo reset link:{" "}
          <Link
            className="font-medium underline"
            href={`/reset-password?token=${demo.demoToken}&username=${demo.username}`}
          >
            Continue to reset password
          </Link>
        </Alert>
      ) : null}
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand-700 hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
