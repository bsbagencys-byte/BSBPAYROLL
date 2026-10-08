"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveStatutoryRuleVersionAction } from "@/actions/statutory";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  STATUTORY_HEADS,
  STATUTORY_HEAD_LABELS,
  STATUTORY_RULE_STATUSES,
  STATUTORY_RULE_STATUS_LABELS,
  TAX_REGIME_LABELS,
  TAX_REGIMES,
} from "@/lib/constants";
import type { ActionResult, StatutoryRuleVersion } from "@/types";

const initial: ActionResult = { success: false };

export function StatutoryRuleVersionForm({ row }: { row?: StatutoryRuleVersion }) {
  const [state, action, pending] = useActionState(saveStatutoryRuleVersionAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? `Edit ${row.version_code}` : "Add rule version"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div>
            <Label htmlFor="head">Head</Label>
            <Select id="head" name="head" className="mt-1" defaultValue={row?.head ?? "PF"}>
              {STATUTORY_HEADS.map((item) => (
                <option key={item} value={item}>
                  {STATUTORY_HEAD_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="versionCode">Version code</Label>
            <Input id="versionCode" name="versionCode" className="mt-1" defaultValue={row?.version_code} required />
            <FieldError>{state.errors?.versionCode?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" defaultValue={row?.name} required />
            <FieldError>{state.errors?.name?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Input id="jurisdiction" name="jurisdiction" className="mt-1" defaultValue={row?.jurisdiction ?? "INDIA"} />
          </div>
          <div>
            <Label htmlFor="stateCode">State code</Label>
            <Input id="stateCode" name="stateCode" className="mt-1" defaultValue={row?.state_code ?? ""} />
          </div>
          <div>
            <Label htmlFor="taxYear">Tax year</Label>
            <Input id="taxYear" name="taxYear" className="mt-1" defaultValue={row?.tax_year ?? ""} />
          </div>
          <div>
            <Label htmlFor="regime">Regime</Label>
            <Select id="regime" name="regime" className="mt-1" defaultValue={row?.regime ?? ""}>
              <option value="">None</option>
              {TAX_REGIMES.map((item) => (
                <option key={item} value={item}>
                  {TAX_REGIME_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "DRAFT"}>
              {STATUTORY_RULE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUTORY_RULE_STATUS_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" className="mt-1" defaultValue={row?.effective_from} required />
          </div>
          <div>
            <Label htmlFor="effectiveTo">Effective to</Label>
            <Input id="effectiveTo" name="effectiveTo" type="date" className="mt-1" defaultValue={row?.effective_to ?? ""} />
          </div>
          <div>
            <Label htmlFor="sourceName">Source name</Label>
            <Input id="sourceName" name="sourceName" className="mt-1" defaultValue={row?.source_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input id="sourceUrl" name="sourceUrl" className="mt-1" defaultValue={row?.source_url ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="sourceCitation">Source citation</Label>
            <Input id="sourceCitation" name="sourceCitation" className="mt-1" defaultValue={row?.source_citation ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="configJson">Config JSON</Label>
            <textarea
              id="configJson"
              name="configJson"
              className="mt-1 min-h-32 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
              defaultValue={row?.config_json ?? "{}"}
              required
            />
            <FieldError>{state.errors?.configJson?.[0]}</FieldError>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" className="mt-1" defaultValue={row?.notes ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save version
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
