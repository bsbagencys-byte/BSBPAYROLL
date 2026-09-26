"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  confirmEmployeeImportAction,
  previewEmployeeImportAction,
  type ImportRowResult,
} from "@/actions/employees";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/layout/app-shell";

const TEMPLATE = `employee_id,first_name,last_name,mobile,joining_date,branch,employment_type,department,designation
BSB-2001,Anita,Nair,9876500001,2024-04-01,Head Office,Full Time,Operations,Staff
BSB-2002,Kiran,Patel,9876500002,2024-05-12,Head Office,Contract,Operations,Staff`;

export function EmployeeImport() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rows, setRows] = useState<ImportRowResult[]>([]);
  const [file, setFile] = useState<File | null>(null);

  function run(kind: "preview" | "confirm") {
    if (!file) {
      setSuccess(false);
      setMessage("Upload a CSV file.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    start(async () => {
      const result = kind === "preview" ? await previewEmployeeImportAction(formData) : await confirmEmployeeImportAction(formData);
      setSuccess(Boolean(result.success));
      setMessage(result.message ?? (result.success ? "Preview ready." : "Import failed."));
      if (result.data?.rows) setRows(result.data.rows);
    });
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Required columns: employee_id, first_name, last_name, mobile, joining_date, branch, employment_type.
            Optional: department, designation.
          </p>
          {message ? <Alert variant={success ? "success" : "error"}>{message}</Alert> : null}
          <div>
            <Label htmlFor="file">CSV file</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,text/csv"
              className="mt-1"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              Download template
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => run("preview")}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Preview
            </Button>
            <Button type="button" disabled={pending || rows.length === 0} onClick={() => run("confirm")}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm import
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No preview yet" description="Upload a CSV and click Preview to validate rows before import." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Row</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Errors</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.row}-${row.employeeCode}`} className="border-b last:border-0">
                  <td className="px-4 py-3">{row.row}</td>
                  <td className="px-4 py-3">{row.employeeCode || "—"}</td>
                  <td className="px-4 py-3">{row.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.status === "error" ? "danger" : row.status === "imported" ? "success" : "warning"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.errors.join("; ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
