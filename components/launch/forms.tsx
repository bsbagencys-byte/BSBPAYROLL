"use client";

import { useActionState, useState, useTransition } from "react";
import {
  compareParallelRunAction,
  createFeedbackAction,
  createIncidentAction,
  recordBiometricAction,
  recordLaunchDecisionAction,
  recordUatResultAction,
  resolveIncidentAction,
  signOffPilotAction,
  toggleChecklistAction,
} from "@/actions/launch";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  BIOMETRIC_TEST_METHODS,
  BIOMETRIC_TEST_METHOD_LABELS,
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  MODULE_READINESS_STATUSES,
  MODULE_READINESS_STATUS_LABELS,
  RELEASE_BLOCKER_SEVERITIES,
  RELEASE_BLOCKER_SEVERITY_LABELS,
  UAT_RESULT_STATUSES,
  UAT_RESULT_STATUS_LABELS,
} from "@/lib/constants";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };

export function RecordLaunchDecisionButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await recordLaunchDecisionAction();
            setOk(Boolean(result.success));
            setMessage(result.message ?? null);
          })
        }
      >
        {pending ? "Recording..." : "Record current launch decision"}
      </Button>
      {message ? <Alert variant={ok ? "success" : "error"}>{message}</Alert> : null}
    </div>
  );
}

export function CreateIncidentForm() {
  const [state, action, pending] = useActionState(createIncidentAction, initial);
  return (
    <Card>
      <CardHeader><CardTitle>Open incident</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <p className="text-sm text-slate-600">Do not include passwords, secrets, full bank numbers or Aadhaar.</p>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required minLength={5} />
            <FieldError>{state.errors?.title?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select id="severity" name="severity" defaultValue="HIGH">
              {INCIDENT_SEVERITIES.map((value) => (
                <option key={value} value={value}>{INCIDENT_SEVERITY_LABELS[value]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="impact">Impact</Label>
            <Input id="impact" name="impact" required minLength={8} placeholder="Org ids only. No secrets." />
            <FieldError>{state.errors?.impact?.[0]}</FieldError>
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Open incident"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResolveIncidentForm({ incidentId }: { incidentId: string }) {
  const [state, action, pending] = useActionState(resolveIncidentAction, initial);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Label htmlFor={`resolution-${incidentId}`}>Resolution</Label>
      <Input id={`resolution-${incidentId}`} name="resolution" required minLength={8} />
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving..." : "Resolve"}</Button>
    </form>
  );
}

export function CreateFeedbackForm({ pilots }: { pilots: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(createFeedbackAction, initial);
  return (
    <Card>
      <CardHeader><CardTitle>Pilot feedback</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <div>
            <Label htmlFor="pilotId">Pilot</Label>
            <Select id="pilotId" name="pilotId" required>
              {pilots.map((pilot) => <option key={pilot.id} value={pilot.id}>{pilot.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="moduleKey">Module</Label>
            <Input id="moduleKey" name="moduleKey" required placeholder="PAYROLL" />
          </div>
          <div>
            <Label htmlFor="kind">Kind</Label>
            <Select id="kind" name="kind" defaultValue="DEFECT">
              {FEEDBACK_KINDS.map((value) => <option key={value} value={value}>{FEEDBACK_KIND_LABELS[value]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select id="severity" name="severity" defaultValue="HIGH">
              {RELEASE_BLOCKER_SEVERITIES.map((value) => (
                <option key={value} value={value}>{RELEASE_BLOCKER_SEVERITY_LABELS[value]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="summary">Summary</Label>
            <Input id="summary" name="summary" required minLength={8} />
          </div>
          <div>
            <Label htmlFor="reproduction">Reproduction</Label>
            <Input id="reproduction" name="reproduction" />
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "File feedback"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function UatResultForm({ itemId, blocked }: { itemId: string; blocked: boolean }) {
  const [state, action, pending] = useActionState(recordUatResultAction, initial);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <Select name="status" defaultValue={blocked ? "BLOCKED" : "NOT_TESTED"}>
        {UAT_RESULT_STATUSES.map((value) => (
          <option key={value} value={value} disabled={blocked && value === "PASS"}>{UAT_RESULT_STATUS_LABELS[value]}</option>
        ))}
      </Select>
      <Input name="tester" required minLength={2} placeholder="Tester" />
      <Input name="evidence" placeholder="Evidence note" />
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving..." : "Save UAT"}</Button>
    </form>
  );
}

export function ParallelCompareForm({ runId }: { runId: string }) {
  const [state, action, pending] = useActionState(compareParallelRunAction, initial);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="runId" value={runId} />
      <Input name="expectedNet" required placeholder="Expected net" />
      <Input name="calculatedNet" required placeholder="BSB calculated net" />
      <Input name="notes" placeholder="Mismatch source" />
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving..." : "Compare (do not finalize)"}</Button>
    </form>
  );
}

export function BiometricRecordForm() {
  const [state, action, pending] = useActionState(recordBiometricAction, initial);
  return (
    <Card>
      <CardHeader><CardTitle>Record hardware test</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <p className="text-sm text-slate-600">Advertised models require physical-device verification. Untested models stay unclaimed.</p>
          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Select id="vendor" name="vendor" defaultValue="ESSL">
              <option value="ESSL">eSSL</option>
              <option value="ZKTECO">ZKTeco</option>
              <option value="MATRIX">Matrix</option>
              <option value="GENERIC">Generic</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" required />
          </div>
          <div>
            <Label htmlFor="method">Method</Label>
            <Select id="method" name="method" defaultValue="SIMULATED">
              {BIOMETRIC_TEST_METHODS.map((value) => (
                <option key={value} value={value}>{BIOMETRIC_TEST_METHOD_LABELS[value]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="result">Result</Label>
            <Select id="result" name="result" defaultValue="NOT_TESTED">
              {MODULE_READINESS_STATUSES.map((value) => (
                <option key={value} value={value}>{MODULE_READINESS_STATUS_LABELS[value]}</option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="advertised" />
            Advertised compatibility (requires physical verification)
          </label>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" required minLength={8} />
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record verification"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SignOffPilotForm({ pilotId }: { pilotId: string }) {
  const [state, action, pending] = useActionState(signOffPilotAction, initial);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="pilotId" value={pilotId} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" required />
        Confirm tested workflows only. This is not a production launch.
      </label>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving..." : "Sign off pilot"}</Button>
    </form>
  );
}

export function ChecklistToggleForm({ itemId, complete }: { itemId: string; complete: boolean }) {
  const [state, action, pending] = useActionState(toggleChecklistAction, initial);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      {complete ? null : <input type="hidden" name="complete" value="true" />}
      <Input name="evidence" placeholder="Evidence" />
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving..." : complete ? "Keep recorded" : "Mark complete"}</Button>
    </form>
  );
}
