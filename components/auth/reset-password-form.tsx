"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, FieldError } from "@/components/ui/alert";
import type { ActionResult } from "@/types";

const initialState: ActionResult = { success: false };

export function ResetPasswordForm({ token, username }: { token: string; username: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="username" value={username} />
      {state?.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <div>
        <Label htmlFor="password">New password</Label>
        <div className="relative mt-1">
          <Input id="password" name="password" type={show ? "text" : "password"} required />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
            onClick={() => setShow((v) => !v)}
            aria-label="Toggle password visibility"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Min 8 characters, with a letter, number and special character.</p>
        <FieldError>{state?.errors?.password?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type={show ? "text" : "password"} className="mt-1" required />
        <FieldError>{state?.errors?.confirmPassword?.[0]}</FieldError>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Update password
      </Button>
      {state?.success ? (
        <p className="text-center text-sm">
          <Link href="/login" className="text-brand-700 hover:underline">
            Go to login
          </Link>
        </p>
      ) : null}
    </form>
  );
}
