"use client";

import { useState, useTransition } from "react";
import { decideLeaveAction } from "@/actions/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LeaveRequestStatus } from "@/lib/constants";

export function LeaveRequestActions({
  id,
  status,
  canApprove,
  canCancel,
  canWithdraw,
}: {
  id: string;
  status: LeaveRequestStatus;
  canApprove: boolean;
  canCancel: boolean;
  canWithdraw: boolean;
}) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(action: "APPROVED" | "REJECTED" | "CANCELLED" | "WITHDRAWN") {
    start(async () => {
      const result = await decideLeaveAction(id, action, reason || undefined);
      setMessage(result.message ?? (result.success ? "Updated." : "Failed."));
    });
  }

  if (!["PENDING", "APPROVED"].includes(status)) return null;

  return (
    <div className="flex flex-col gap-2">
      {status === "PENDING" && canApprove ? (
        <Input placeholder="Decision reason (required to reject)" value={reason} onChange={(e) => setReason(e.target.value)} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && canApprove ? (
          <>
            <Button size="sm" disabled={pending} onClick={() => run("APPROVED")}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("REJECTED")}>
              Reject
            </Button>
          </>
        ) : null}
        {canWithdraw && status === "PENDING" ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("WITHDRAWN")}>
            Withdraw
          </Button>
        ) : null}
        {canCancel && (status === "PENDING" || status === "APPROVED") ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("CANCELLED")}>
            Cancel
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
