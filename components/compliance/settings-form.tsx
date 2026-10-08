"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveOrgStatutorySettingsAction } from "@/actions/statutory";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TAX_REGIME_LABELS, TAX_REGIMES } from "@/lib/constants";
import type { ActionResult, OrgStatutorySettings } from "@/types";

const initial: ActionResult = { success: false };

export function OrgStatutorySettingsForm({ settings }: { settings: OrgStatutorySettings }) {
  const [state, action, pending] = useActionState(saveOrgStatutorySettingsAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization statutory settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pfEnabled" defaultChecked={settings.pf_enabled} />
            PF enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="esiEnabled" defaultChecked={settings.esi_enabled} />
            ESI enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ptEnabled" defaultChecked={settings.pt_enabled} />
            PT enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="lwfEnabled" defaultChecked={settings.lwf_enabled} />
            LWF enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="tdsEnabled" defaultChecked={settings.tds_enabled} />
            TDS enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pfRestrictToCeiling" defaultChecked={settings.pf_restrict_to_ceiling} />
            Restrict PF wage to ceiling
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showEmployerOnPayslip" defaultChecked={settings.show_employer_on_payslip} />
            Show employer contributions on payslip
          </label>
          <div>
            <Label htmlFor="defaultStateCode">Default state code</Label>
            <Input id="defaultStateCode" name="defaultStateCode" className="mt-1" defaultValue={settings.default_state_code ?? "KA"} />
          </div>
          <div>
            <Label htmlFor="tdsDefaultRegime">Default TDS regime</Label>
            <Select id="tdsDefaultRegime" name="tdsDefaultRegime" className="mt-1" defaultValue={settings.tds_default_regime}>
              {TAX_REGIMES.map((item) => (
                <option key={item} value={item}>
                  {TAX_REGIME_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
