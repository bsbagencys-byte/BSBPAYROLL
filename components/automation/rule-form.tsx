"use client";

import { useActionState } from "react";
import { saveRuleAction, testRuleAction } from "@/actions/automation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGER_TYPES,
} from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function RuleForm() {
  const [state, action, pending] = useActionState(saveRuleAction, initial);
  const [testState, testAction, testPending] = useActionState(testRuleAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create rule</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {state.message ? (
            <div className="md:col-span-2">
              <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="triggerType">Trigger</Label>
            <Select id="triggerType" name="triggerType" className="mt-1" required>
              {AUTOMATION_TRIGGER_TYPES.map((item) => (
                <option key={item} value={item}>
                  {AUTOMATION_TRIGGER_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="actionType">Action</Label>
            <Select id="actionType" name="actionType" className="mt-1" required>
              {AUTOMATION_ACTION_TYPES.map((item) => (
                <option key={item} value={item}>
                  {AUTOMATION_ACTION_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="conditionField">Condition field (optional)</Label>
            <Input id="conditionField" name="conditionField" className="mt-1" placeholder="status" />
          </div>
          <div>
            <Label htmlFor="conditionValue">Condition value</Label>
            <Input id="conditionValue" name="conditionValue" className="mt-1" />
            <input type="hidden" name="conditionOp" value="eq" />
          </div>
          <div>
            <Label htmlFor="actionTitle">Action title</Label>
            <Input id="actionTitle" name="actionTitle" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="actionHref">Link</Label>
            <Input id="actionHref" name="actionHref" className="mt-1" placeholder="/leave/approvals" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="actionBody">Body</Label>
            <Input id="actionBody" name="actionBody" className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked />
            Enabled
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              Save rule
            </Button>
          </div>
        </form>
        {testState.message ? <p className="mt-3 text-sm text-slate-600">{testState.message}</p> : null}
        <form action={testAction} className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="testId">Test existing rule id</Label>
            <Input id="testId" name="id" className="mt-1" />
          </div>
          <Button type="submit" variant="outline" disabled={testPending}>
            Test
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
