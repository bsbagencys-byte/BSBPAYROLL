"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  archiveEmployeeDocumentAction,
  getEmployeeDocumentUrlAction,
  uploadEmployeeDocumentAction,
} from "@/actions/employees";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/layout/app-shell";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES, type DocumentType } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { ActionResult, EmployeeDocument } from "@/types";

const initial: ActionResult = { success: false };

export function EmployeeDocuments({
  employeeId,
  documents,
  canManage,
  timezone,
}: {
  employeeId: string;
  documents: EmployeeDocument[];
  canManage: boolean;
  timezone: string;
}) {
  const [state, action, pending] = useActionState(uploadEmployeeDocumentAction, initial);

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload document</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="employeeId" value={employeeId} />
              {state?.message ? <Alert className="sm:col-span-2" variant={state.success ? "success" : "error"}>{state.message}</Alert> : null}
              <div>
                <Label htmlFor="documentType">Document type</Label>
                <Select id="documentType" name="documentType" className="mt-1" defaultValue="OTHER">
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="file">File</Label>
                <Input id="file" name="file" type="file" className="mt-1" required />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Upload
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState title="No documents" description="Offer letters, ID proofs and other files will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{doc.file_name}</div>
                    <div className="text-xs text-slate-500">{doc.mime_type ?? "file"}</div>
                  </td>
                  <td className="px-4 py-3">{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] ?? doc.document_type}</td>
                  <td className="px-4 py-3">{formatDateTime(doc.uploaded_at, timezone)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={doc.status === "ACTIVE" ? "success" : "muted"}>{doc.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DocumentActions documentId={doc.id} canManage={canManage} archived={doc.status === "ARCHIVED"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentActions({
  documentId,
  canManage,
  archived,
}: {
  documentId: string;
  canManage: boolean;
  archived: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex justify-end gap-2">
      {canManage ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await getEmployeeDocumentUrlAction(documentId);
              if (result.success && result.data?.url) {
                window.open(result.data.url, "_blank", "noopener,noreferrer");
              } else {
                setMessage(result.message ?? "Unable to open file.");
              }
            })
          }
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Open
        </Button>
      ) : null}
      {canManage && !archived ? (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await archiveEmployeeDocumentAction(documentId);
              setMessage(result.message ?? null);
            })
          }
        >
          Archive
        </Button>
      ) : null}
      {message ? <span className="self-center text-xs text-slate-500">{message}</span> : null}
    </div>
  );
}
