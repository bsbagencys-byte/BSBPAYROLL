"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";
import { getSelfDocumentUrlAction } from "@/actions/ess";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/constants";
import { formatDateOnly } from "@/lib/utils";
import type { EmployeeDocument } from "@/types";

export function EssDocumentList({ documents }: { documents: EmployeeDocument[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function download(documentId: string) {
    setError(null);
    setLoadingId(documentId);
    startTransition(async () => {
      const result = await getSelfDocumentUrlAction(documentId);
      setLoadingId(null);
      if (!result.success || !result.data) {
        setError(result.message ?? "Unable to open the document.");
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  if (documents.length === 0) {
    return <p className="text-sm text-slate-500">No documents on file.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium">{doc.file_name}</p>
              <p className="text-xs text-slate-500">
                {DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] ?? doc.document_type}
                {doc.created_at ? ` · ${formatDateOnly(doc.created_at)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={doc.status === "ACTIVE" ? "muted" : "warning"}>{doc.status.toLowerCase()}</Badge>
            {doc.status === "ACTIVE" ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => download(doc.id)}>
                {pending && loadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Download
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
