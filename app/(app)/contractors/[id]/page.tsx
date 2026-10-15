import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { ContractorStatusBadge } from "@/components/contractors/status-badge";
import { ContractorForm } from "@/components/contractors/contractor-form";
import { EngagementForm } from "@/components/contractors/engagement-form";
import { EngagementTable } from "@/components/contractors/engagement-table";
import { InvoiceTable } from "@/components/contractors/invoice-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadContractorDetail } from "@/lib/exits/query";
import { CONTRACTOR_BUSINESS_TYPE_LABELS } from "@/lib/constants";

export const metadata = { title: "Contractor" };

export default async function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionOrRedirect("contractors.view");
  const { id } = await params;
  const detail = await loadContractorDetail(user.organization.id, id, user.organization.timezone);
  if (!detail.row) notFound();
  const contractor = detail.row.contractor;
  const canManage = hasPermission(user, "contractors.manage");
  const canEngage = hasPermission(user, "contractors.engagements.manage");

  return (
    <div>
      <PageHeader
        title={contractor.display_name}
        description={`${contractor.contractor_code} · ${CONTRACTOR_BUSINESS_TYPE_LABELS[contractor.business_type]}`}
        actions={
          <Link href="/contractors">
            <Button variant="outline">Back</Button>
          </Link>
        }
      />
      <ContractorsSubnav />
      <div className="mb-4">
        <ContractorStatusBadge status={contractor.status} />
      </div>
      {canManage ? (
        <div className="mb-6">
          <ContractorForm row={contractor} employees={detail.employees} />
        </div>
      ) : null}
      {canEngage ? (
        <div className="mb-6">
          <EngagementForm contractors={[contractor]} lockedContractorId={contractor.id} />
        </div>
      ) : null}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.engagements.length ? <EngagementTable items={detail.engagements} /> : <p className="text-sm text-slate-500">No engagements.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.invoices.length ? <InvoiceTable items={detail.invoices} /> : <p className="text-sm text-slate-500">No invoices.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
