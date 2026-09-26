"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, FieldError } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/app-shell";
import type { ActionResult } from "@/types";

export type CatalogField = {
  name: string;
  label: string;
  type?: "text" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type CatalogRow = {
  id: string;
  name: string;
  status: string;
  isSystem?: boolean;
  isDefault?: boolean;
  subtitle?: string;
  values: Record<string, string>;
};

const initial: ActionResult = { success: false };

export function CatalogManager({
  title,
  itemLabel,
  description,
  rows,
  fields,
  canManage,
  saveAction,
  toggleAction,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  itemLabel: string;
  description: string;
  rows: CatalogRow[];
  fields: CatalogField[];
  canManage: boolean;
  saveAction: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  toggleAction: (id: string, enable: boolean) => Promise<ActionResult>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.name.toLowerCase().includes(q) ||
        (row.subtitle ?? "").toLowerCase().includes(q) ||
        Object.values(row.values).some((value) => value.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder={`Search ${title.toLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </Select>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            Add {itemLabel.toLowerCase()}
          </Button>
        ) : null}
      </div>

      {creating ? (
        <CatalogForm
          title={`Add ${title.replace(/s$/, "").toLowerCase()}`}
          fields={fields}
          saveAction={saveAction}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <CatalogForm
          title={`Edit ${editing.name}`}
          fields={fields}
          row={editing}
          saveAction={saveAction}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {row.values.code ? `Code ${row.values.code}` : description}
                      {row.isDefault ? " · default" : ""}
                      {row.isSystem ? " · system" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.subtitle || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.status === "ACTIVE" ? "success" : "danger"}>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canManage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(row);
                            setCreating(false);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canManage ? <StatusToggle id={row.id} enabled={row.status === "ACTIVE"} action={toggleAction} /> : null}
                    </div>
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

function StatusToggle({
  id,
  enabled,
  action,
}: {
  id: string;
  enabled: boolean;
  action: (id: string, enable: boolean) => Promise<ActionResult>;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={enabled ? "destructive" : "secondary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await action(id, !enabled);
            setMessage(result.message ?? null);
          })
        }
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {enabled ? "Disable" : "Enable"}
      </Button>
      {message ? <span className="text-xs text-slate-500">{message}</span> : null}
    </div>
  );
}

function CatalogForm({
  title,
  fields,
  row,
  saveAction,
  onClose,
}: {
  title: string;
  fields: CatalogField[];
  row?: CatalogRow;
  saveAction: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ActionResult | undefined, formData: FormData) => {
    const result = await saveAction(prev, formData);
    if (result.success) onClose();
    return result;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state?.message ? (
            <Alert className="sm:col-span-2" variant={state.success ? "success" : "error"}>
              {state.message}
            </Alert>
          ) : null}
          {fields.map((field) => (
            <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "select" ? (
                <Select id={field.name} name={field.name} className="mt-1" defaultValue={row?.values[field.name] ?? ""}>
                  <option value="">{field.placeholder ?? "Select"}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  defaultValue={row?.values[field.name] ?? ""}
                  placeholder={field.placeholder}
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  className="mt-1"
                  required={field.required}
                  defaultValue={row?.values[field.name] ?? ""}
                  placeholder={field.placeholder}
                />
              )}
              <FieldError>{state?.errors?.[field.name]?.[0]}</FieldError>
            </div>
          ))}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" className="mt-1" defaultValue={row?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
