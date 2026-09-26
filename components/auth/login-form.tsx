"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, FieldError } from "@/components/ui/alert";
import type { ActionResult } from "@/types";
import { isDemoMode, hasSupabaseConfig } from "@/lib/env-public";

const initialState: ActionResult = { success: false };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const demo = !hasSupabaseConfig() || isDemoMode();

  return (
    <form action={action} className="space-y-4">
      {state?.message && !state.success ? <Alert>{state.message}</Alert> : null}

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="Enter your username"
          className="mt-1"
          required
        />
        <FieldError>{state?.errors?.username?.[0]}</FieldError>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline">
            Forgot password
          </Link>
        </div>
        <div className="relative mt-1">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <FieldError>{state?.errors?.password?.[0]}</FieldError>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="remember" className="h-4 w-4 rounded border-slate-300" />
        Remember session
      </label>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Signing in..." : "Login"}
      </Button>

      {demo ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Development demo accounts</p>
          <ul className="mt-1 space-y-0.5">
            <li>bsbadmin / Admin@123 (Super Admin)</li>
            <li>bsbhr / Hruser@123 (HR)</li>
            <li>bsbpayroll / Payroll@123 (Payroll)</li>
            <li>bsbemployee / Employee@123 (Employee)</li>
          </ul>
        </div>
      ) : null}
    </form>
  );
}
