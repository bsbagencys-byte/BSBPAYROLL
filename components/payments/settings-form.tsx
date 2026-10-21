"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { savePaymentSettingsAction } from "@/actions/payments";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { DEFAULT_BANK_COLUMNS } from "@/lib/payments/columns";
import type { ActionResult, PaymentSettings } from "@/types";

const initial: ActionResult = { success: false };

function selectedKeys(settings: PaymentSettings) {
  try {
    const parsed = JSON.parse(settings.columns_json) as Array<{ key: string }>;
    return parsed.map((col) => col.key);
  } catch {
    return DEFAULT_BANK_COLUMNS.map((col) => col.key);
  }
}

export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const [state, action, pending] = useActionState(savePaymentSettingsAction, initial);
  const selected = selectedKeys(settings);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generic bank file mapping</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="defaultMethod">Default method</Label>
            <Select id="defaultMethod" name="defaultMethod" className="mt-1" defaultValue={settings.default_method}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filePrefix">File prefix</Label>
            <Input id="filePrefix" name="filePrefix" className="mt-1" defaultValue={settings.file_prefix} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="bankAccountReference">Company bank reference</Label>
            <Input id="bankAccountReference" name="bankAccountReference" className="mt-1" defaultValue={settings.bank_account_reference ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="includeHeader" value="on" defaultChecked={settings.include_header} />
            Include CSV header
          </label>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">Columns</p>
            <div className="grid gap-2 md:grid-cols-2">
              {DEFAULT_BANK_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="columns" value={col.key} defaultChecked={selected.includes(col.key)} />
                  {col.header}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save mapping
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">This is a configurable generic CSV. There is no Tally, Zoho or direct bank API in this product.</p>
      </CardContent>
    </Card>
  );
}
