import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { SalarySubnav } from "@/components/salary/subnav";
import { SalaryStructureForm } from "@/components/salary/structure-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { listSalaryComponents, listSalaryStructures, listStructureItems } from "@/lib/salary/repository";
import { toggleSalaryStructureAction } from "@/actions/salary";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

export const metadata = { title: "Salary structures" };

export default async function SalaryStructuresPage() {
  const user = await requirePermissionOrRedirect("salary.view");
  const [structures, components, items] = await Promise.all([
    listSalaryStructures(user.organization.id),
    listSalaryComponents(user.organization.id),
    listStructureItems(user.organization.id),
  ]);
  const canManage = hasPermission(user, "salary.structure.manage");

  return (
    <div>
      <PageHeader title="Salary structures" description="Reusable templates such as Basic 40% of CTC, HRA 40% of Basic, Special residual." />
      <SalarySubnav />
      {canManage ? (
        <div className="mb-6">
          <SalaryStructureForm components={components} />
        </div>
      ) : null}
      {structures.length === 0 ? (
        <EmptyState title="No structures" description="Create a CTC template and attach components." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">CTC</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
                {canManage ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {structures.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{item.ctc_amount ? formatCurrency(item.ctc_amount) : "—"}</td>
                  <td className="px-4 py-3">{items.filter((row) => row.structure_id === item.id).length}</td>
                  <td className="px-4 py-3">{formatDateOnly(item.effective_from)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <form action={toggleSalaryStructureAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value={item.status} />
                        <Button type="submit" size="sm" variant="outline">
                          {item.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
