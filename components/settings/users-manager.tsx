"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { createUserAction, toggleUserStatusAction, updateUserAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, FieldError } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ROLE_CODES, ROLE_LABELS, type RoleCode } from "@/lib/constants";
import { EmptyState } from "@/components/layout/app-shell";
import type { ActionResult, Branch } from "@/types";

export type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  mobile: string | null;
  roleCode: RoleCode;
  roleName: string;
  branchId: string;
  branchName: string;
  status: string;
  membershipStatus: string;
  isDemo: boolean;
};

const initial: ActionResult = { success: false };

export function UsersManager({
  users,
  branches,
  canCreate,
  canEdit,
  canDisable,
  currentUserId,
}: {
  users: ManagedUser[];
  branches: Branch[];
  canCreate: boolean;
  canEdit: boolean;
  canDisable: boolean;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q);
      const matchesRole = roleFilter === "ALL" || u.roleCode === roleFilter;
      const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-40">
            <option value="ALL">All roles</option>
            {ROLE_CODES.map((code) => (
              <option key={code} value={code}>
                {ROLE_LABELS[code]}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </Select>
        </div>
        {canCreate ? (
          <Button onClick={() => { setCreating(true); setEditing(null); }}>Add user</Button>
        ) : null}
      </div>

      {creating ? <UserForm mode="create" branches={branches} onClose={() => setCreating(false)} /> : null}
      {editing ? <UserForm mode="edit" user={editing} branches={branches} onClose={() => setEditing(null)} /> : null}

      {filtered.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or filter, or add a user." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-xs text-slate-500">@{user.username} {user.isDemo ? "· demo" : ""}</div>
                  </td>
                  <td className="px-4 py-3">{user.mobile ?? "—"}</td>
                  <td className="px-4 py-3">{user.roleName}</td>
                  <td className="px-4 py-3">{user.branchName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === "ACTIVE" ? "success" : "danger"}>{user.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canEdit ? (
                        <Button size="sm" variant="outline" onClick={() => { setEditing(user); setCreating(false); }}>
                          Edit
                        </Button>
                      ) : null}
                      {canDisable && user.id !== currentUserId ? (
                        <StatusToggle userId={user.id} enabled={user.status === "ACTIVE"} />
                      ) : null}
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

function StatusToggle({ userId, enabled }: { userId: string; enabled: boolean }) {
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
            const result = await toggleUserStatusAction(userId, !enabled);
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

function UserForm({
  mode,
  user,
  branches,
  onClose,
}: {
  mode: "create" | "edit";
  user?: ManagedUser;
  branches: Branch[];
  onClose: () => void;
}) {
  const actionFn = mode === "create" ? createUserAction : updateUserAction;
  const [state, action, pending] = useActionState(async (prev: ActionResult | undefined, formData: FormData) => {
    const result = await actionFn(prev, formData);
    if (result.success) onClose();
    return result;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add user" : "Edit user"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          {user ? <input type="hidden" name="userId" value={user.id} /> : null}
          {state?.message && !state.success ? <Alert className="sm:col-span-2">{state.message}</Alert> : null}
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" className="mt-1" defaultValue={user?.username} required disabled={mode === "edit"} />
            <FieldError>{state?.errors?.username?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" className="mt-1" defaultValue={user?.displayName} required />
            <FieldError>{state?.errors?.displayName?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" name="mobile" className="mt-1" defaultValue={user?.mobile ?? ""} />
            <FieldError>{state?.errors?.mobile?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="roleCode">Role</Label>
            <Select id="roleCode" name="roleCode" className="mt-1" defaultValue={user?.roleCode ?? "EMPLOYEE"}>
              {ROLE_CODES.map((code) => (
                <option key={code} value={code}>
                  {ROLE_LABELS[code]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select id="branchId" name="branchId" className="mt-1" defaultValue={user?.branchId ?? branches[0]?.id ?? ""}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          {mode === "create" ? (
            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" className="mt-1" required />
              <FieldError>{state?.errors?.password?.[0]}</FieldError>
            </div>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create user" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
