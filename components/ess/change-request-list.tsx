"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { cancelChangeRequestAction, decideChangeRequestAction } from "@/actions/ess";
import { EssStatusBadge } from "@/components/ess/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ESS_CHANGE_CATEGORY_LABELS, ESS_CHANGE_REQUEST_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { ActionResult, EssChangeRequestListItem } from "@/types";

const initial: ActionResult = { success: false };

export function ChangeRequestList({
  rows,
  mode,
  timezone,
}: {
  rows: EssChangeRequestListItem[];
  mode: "self" | "review";
  timezone: string;
}) {
  const [state, action, pending] = useActionState(decideChangeRequestAction, initial);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{mode === "review" ? "Pending review" : "My change requests"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No change requests to show.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "review" ? "Profile change requests" : "My change requests"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.message ? <Alert variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
        {mode === "review" ? (
          <p className="text-xs text-slate-500">
            Approving records the decision and notifies the employee. Apply the corrected value through the employee
            master screen; nothing is written automatically here.
          </p>
        ) : null}
        {rows.map((row) => (
          <div key={row.request.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {ESS_CHANGE_CATEGORY_LABELS[row.request.category]} · {row.request.field_key}
                </p>
                <p className="text-xs text-slate-500">
                  {mode === "review" ? `${row.employeeName} (${row.employeeCode}) · ` : ""}
                  {formatDateTime(row.request.created_at, timezone)}
                </p>
              </div>
              <EssStatusBadge
                status={row.request.status}
                label={ESS_CHANGE_REQUEST_STATUS_LABELS[row.request.status]}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {row.request.current_value ? `${row.request.current_value} → ` : ""}
              <span className="font-medium text-slate-900">{row.request.requested_value}</span>
            </p>
            {row.request.reason ? <p className="mt-1 text-xs text-slate-500">Reason: {row.request.reason}</p> : null}
            {row.request.review_reason ? (
              <p className="mt-1 text-xs text-slate-500">Reviewer: {row.request.review_reason}</p>
            ) : null}

            {mode === "review" && row.request.status === "PENDING" ? (
              <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="requestId" value={row.request.id} />
                <Input name="reason" className="h-8 w-56" placeholder="Review note (required to reject)" />
                <Button type="submit" name="decision" value="APPROVED" size="sm" disabled={pending}>
                  Approve
                </Button>
                <Button type="submit" name="decision" value="REJECTED" size="sm" variant="destructive" disabled={pending}>
                  Reject
                </Button>
                {pending ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </form>
            ) : null}

            {mode === "self" && row.request.status === "PENDING" ? (
              <form action={cancelChangeRequestAction} className="mt-3">
                <input type="hidden" name="requestId" value={row.request.id} />
                <Button type="submit" size="sm" variant="outline">
                  Cancel request
                </Button>
              </form>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
