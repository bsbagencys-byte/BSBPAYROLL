import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ExitsSubnav } from "@/components/exits/subnav";
import { ClearanceItemForm } from "@/components/exits/clearance-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadExitsCatalog } from "@/lib/exits/query";
import { ensureDefaultClearanceItems } from "@/lib/exits/service";
import { CLEARANCE_DEPARTMENT_LABELS } from "@/lib/constants";

export const metadata = { title: "Exit clearance" };

export default async function ExitClearancePage() {
  const user = await requirePermissionOrRedirect("exits.view");
  await ensureDefaultClearanceItems(user.organization.id, user.id);
  const catalog = await loadExitsCatalog(user.organization.id);
  const canEdit = hasPermission(user, "exits.edit");

  return (
    <div>
      <PageHeader title="Clearance checklist" description="Required items block settlement. Optional items do not." />
      <ExitsSubnav />
      {canEdit ? (
        <div className="mb-6">
          <ClearanceItemForm />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Template items</CardTitle>
        </CardHeader>
        <CardContent>
          {catalog.items.length === 0 ? (
            <EmptyState title="No clearance items" description="Add a department checklist item." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Department</th>
                    <th className="py-2 pr-4">Due days</th>
                    <th className="py-2">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{item.code}</td>
                      <td className="py-2 pr-4">{item.name}</td>
                      <td className="py-2 pr-4">{CLEARANCE_DEPARTMENT_LABELS[item.department]}</td>
                      <td className="py-2 pr-4">{item.default_due_days}</td>
                      <td className="py-2">
                        <Badge variant={item.required ? "warning" : "muted"}>{item.required ? "Required" : "Optional"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
