import { Card, CardContent } from "@/components/ui/card";
import { initials } from "@/lib/utils";
import type { SelfIdentity } from "@/lib/ess/identity";

export function SelfHeader({ identity }: { identity: SelfIdentity }) {
  const { employee } = identity;
  return (
    <Card className="mb-6">
      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-semibold text-white">
          {initials(employee.display_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-slate-900">{employee.display_name}</p>
          <p className="text-sm text-slate-500">
            {employee.employee_code}
            {identity.designationName ? ` · ${identity.designationName}` : ""}
            {identity.departmentName ? ` · ${identity.departmentName}` : ""}
          </p>
          {identity.managerName ? (
            <p className="text-xs text-slate-500">Reporting manager: {identity.managerName}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
