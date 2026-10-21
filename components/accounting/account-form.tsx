"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveAccountAction } from "@/actions/accounting";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCOUNTING_ACCOUNT_TYPE_LABELS, ACCOUNTING_ACCOUNT_TYPES } from "@/lib/constants";
import type { AccountingAccount, ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function LedgerAccountForm({ account }: { account?: AccountingAccount | null }) {
  const [state, action, pending] = useActionState(saveAccountAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{account ? "Edit ledger account" : "New ledger account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          {account ? <input type="hidden" name="id" value={account.id} /> : null}
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" className="mt-1" defaultValue={account?.code} required />
            <FieldError>{state.errors?.code?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={account?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="accountType">Type</Label>
            <Select id="accountType" name="accountType" className="mt-1" defaultValue={account?.account_type ?? "EXPENSE"}>
              {ACCOUNTING_ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACCOUNTING_ACCOUNT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={account?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" className="mt-1" defaultValue={account?.description ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
