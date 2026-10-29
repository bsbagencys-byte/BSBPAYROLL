"use client";

import { useActionState, useState, useTransition } from "react";
import {
  confirmImportAction,
  confirmOffboardingAction,
  createSupportTicketAction,
  downloadDataExportAction,
  previewImportAction,
  refreshOnboardingAction,
  replySupportTicketAction,
  requestDataExportAction,
  requestOffboardingAction,
  skipAttendanceAction,
  updateSupportStatusAction,
} from "@/actions/onboarding";
import { Alert, FieldError } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DATA_EXPORT_KIND_LABELS,
  DATA_EXPORT_KINDS,
  IMPORT_ENTITY_TYPE_LABELS,
  IMPORT_ENTITY_TYPES,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  type ImportEntityType,
} from "@/lib/constants";
import { IMPORT_TEMPLATES, templateCsv } from "@/lib/onboarding/engine";
import type { ActionResult } from "@/types";

const initial: ActionResult = { success: false };
const initialWithJob: ActionResult<{ jobId: string }> = { success: false };
const initialWithId: ActionResult<{ id: string }> = { success: false };

export function RefreshOnboardingButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await refreshOnboardingAction();
            setOk(Boolean(result.success));
            setMessage(result.message ?? null);
          })
        }
      >
        {pending ? "Refreshing..." : "Refresh from stored data"}
      </Button>
      {message ? <Alert variant={ok ? "success" : "error"}>{message}</Alert> : null}
    </div>
  );
}

export function SkipAttendanceForm() {
  const [state, action, pending] = useActionState(skipAttendanceAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Skip attendance (optional)</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <p className="text-sm text-slate-600">
            Phase 4 attendance is not started. Skipping records that this step is optional. It does not mark onboarding complete by itself.
          </p>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" required minLength={3} placeholder="We will configure shifts after Phase 4" />
            <FieldError>{state.errors?.reason?.[0]}</FieldError>
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Saving..." : "Skip attendance step"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ImportPreviewForm({ lastJobId }: { lastJobId?: string }) {
  const [preview, previewAction, previewPending] = useActionState(previewImportAction, initialWithJob);
  const [confirm, confirmAction, confirmPending] = useActionState(confirmImportAction, initial);
  const jobId = preview.data?.jobId || lastJobId || "";

  function downloadTemplate(entity: ImportEntityType) {
    const blob = new Blob([templateCsv(entity)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entity.toLowerCase()}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={previewAction} className="grid gap-3">
            <p className="text-sm text-slate-600">
              CSV only. Excel files are rejected. Preview never writes. Confirm is required. Existing history is preserved.
            </p>
            <div>
              <Label htmlFor="entityType">Import type</Label>
              <Select id="entityType" name="entityType" required defaultValue="EMPLOYEES">
                {IMPORT_ENTITY_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {IMPORT_ENTITY_TYPE_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="file">CSV file</Label>
              <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
            </div>
            {preview.message ? <Alert variant={preview.success ? "success" : "error"}>{preview.message}</Alert> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="outline" disabled={previewPending}>
                {previewPending ? "Previewing..." : "Preview"}
              </Button>
              {IMPORT_ENTITY_TYPES.map((item) => (
                <Button key={item} type="button" variant="ghost" size="sm" onClick={() => downloadTemplate(item)}>
                  {IMPORT_TEMPLATES[item].headers[0] === "employee_id" ? `${IMPORT_ENTITY_TYPE_LABELS[item]} template` : item}
                </Button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Confirm import</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={confirmAction} className="grid gap-3">
            <input type="hidden" name="jobId" value={jobId} />
            <p className="text-sm text-slate-600">
              Historical payroll is labelled imported and is never claimed as BSB-calculated. Leave and loan imports do not rewrite paid history.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirm" value="true" required />
              I confirm this previewed job should write rows
            </label>
            {confirm.message ? <Alert variant={confirm.success ? "success" : "error"}>{confirm.message}</Alert> : null}
            <Button type="submit" disabled={confirmPending || !jobId}>
              {confirmPending ? "Importing..." : "Confirm import"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function NewTicketForm() {
  const [state, action, pending] = useActionState(createSupportTicketAction, initialWithId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New support ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required minLength={5} />
            <FieldError>{state.errors?.subject?.[0]}</FieldError>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" defaultValue="OTHER">
                {SUPPORT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {SUPPORT_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="NORMAL">
                {SUPPORT_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {SUPPORT_PRIORITY_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="body">Details</Label>
            <textarea
              id="body"
              name="body"
              required
              minLength={10}
              rows={6}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <FieldError>{state.errors?.body?.[0]}</FieldError>
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Opening..." : "Open ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SupportReplyForm({
  ticketId,
  platform = false,
}: {
  ticketId: string;
  platform?: boolean;
}) {
  const [state, action, pending] = useActionState(replySupportTicketAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div>
        <Label htmlFor={`body-${ticketId}`}>Reply</Label>
        <textarea
          id={`body-${ticketId}`}
          name="body"
          required
          minLength={2}
          rows={4}
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>
      {platform ? (
        <div>
          <Label htmlFor={`visibility-${ticketId}`}>Visibility</Label>
          <Select id={`visibility-${ticketId}`} name="visibility" defaultValue="CUSTOMER">
            <option value="CUSTOMER">Customer visible</option>
            <option value="INTERNAL">Internal note</option>
          </Select>
        </div>
      ) : (
        <input type="hidden" name="visibility" value="CUSTOMER" />
      )}
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send reply"}
      </Button>
    </form>
  );
}

export function SupportStatusForm({
  ticketId,
  organizationId,
  closed,
}: {
  ticketId: string;
  organizationId?: string;
  closed?: boolean;
}) {
  const [state, action, pending] = useActionState(updateSupportStatusAction, initial);
  if (closed) return null;
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      {organizationId ? <input type="hidden" name="organizationId" value={organizationId} /> : null}
      <Button type="submit" name="action" value="progress" variant="outline" size="sm" disabled={pending}>
        In progress
      </Button>
      <Button type="submit" name="action" value="waiting" variant="outline" size="sm" disabled={pending}>
        Waiting
      </Button>
      <Button type="submit" name="action" value="resolve" variant="outline" size="sm" disabled={pending}>
        Resolve
      </Button>
      <Button type="submit" name="action" value="close" variant="outline" size="sm" disabled={pending}>
        Close
      </Button>
      {state.message ? <Alert variant={state.success ? "success" : "error"} className="w-full">{state.message}</Alert> : null}
    </form>
  );
}

export function DataExportForm() {
  const [state, action, pending] = useActionState(requestDataExportAction, initialWithId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request export</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2 text-sm text-slate-600">
            Exports exclude secrets, full bank numbers and Aadhaar. Ready files expire after 72 hours. Expired files do not delete tenant data.
          </div>
          <div>
            <Label htmlFor="kind">Kind</Label>
            <Select id="kind" name="kind" defaultValue="FULL">
              {DATA_EXPORT_KINDS.map((item) => (
                <option key={item} value={item}>
                  {DATA_EXPORT_KIND_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"} className="md:col-span-2">{state.message}</Alert> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Preparing..." : "Request export"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DownloadExportButton({ jobId, fileName }: { jobId: string; fileName: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await downloadDataExportAction(jobId);
            if (!result.success || !result.data) {
              setMessage(result.message ?? "Download failed.");
              return;
            }
            const blob = new Blob([result.data.content], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = result.data.fileName || fileName;
            link.click();
            URL.revokeObjectURL(url);
            setMessage(null);
          })
        }
      >
        {pending ? "Downloading..." : "Download"}
      </Button>
      {message ? <Alert variant="error">{message}</Alert> : null}
    </div>
  );
}

export function OffboardingForm() {
  const [state, action, pending] = useActionState(requestOffboardingAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request offboarding</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <p className="text-sm text-slate-600">
            Platform-only. A full export is prepared first. Confirm records offboarding and preserves existing history. Nothing is auto-deleted.
          </p>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <textarea
              id="reason"
              name="reason"
              required
              minLength={8}
              rows={4}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <FieldError>{state.errors?.reason?.[0]}</FieldError>
          </div>
          {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Requesting..." : "Request offboarding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ConfirmOffboardingForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(confirmOffboardingAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" value="true" required />
        I confirm offboarding. Tenant data will not be deleted.
      </label>
      {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Recording..." : "Confirm offboarding"}
      </Button>
    </form>
  );
}
