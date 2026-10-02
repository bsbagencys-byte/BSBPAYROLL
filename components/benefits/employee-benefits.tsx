import Link from "next/link";
import { BenefitAssignmentBadge } from "@/components/benefits/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import type { BenefitType, EmployeeBenefit } from "@/types";

export function EmployeeBenefitsPanel({
  assignments,
  types,
}: {
  assignments: EmployeeBenefit[];
  types: BenefitType[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Benefits</CardTitle>
        <Link href="/benefits/employee">
          <Button size="sm" variant="outline">
            Manage
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No benefits assigned.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((item) => {
              const type = types.find((row) => row.id === item.benefit_type_id);
              return (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">{type?.name ?? "Benefit"}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateOnly(item.effective_from)} → {item.effective_to ? formatDateOnly(item.effective_to) : "open"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.amount)}</p>
                    <BenefitAssignmentBadge status={item.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
