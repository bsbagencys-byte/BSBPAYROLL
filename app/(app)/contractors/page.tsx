import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/app-shell";
import { ContractorsSubnav } from "@/components/contractors/subnav";
import { ContractorTable } from "@/components/contractors/contractor-table";
import { InvoiceTable } from "@/components/contractors/invoice-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { loadContractorsOverview } from "@/lib/exits/query";

export const metadata = { title: "Contractors" };

export default async function ContractorsPage() {
  const user = await requirePermissionOrRedirect("contractors.view");
  const overview = await loadContractorsOverview(user.organization.id, user.organization.timezone);
  const canManage = hasPermission(user, "contractors.manage");

  return (
    <div>
      <PageHeader
        title="Contractors"
        description="Vendor register, engagements and invoices. Payments stay outside employee payroll."
        actions={
          canManage ? (
            <Link href="/contractors/new">
              <Button>New contractor</Button>
            </Link>
          ) : null
        }
      />
      <ContractorsSubnav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Active contractors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Engagements expiring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.expiring.length}</p>
            <p className="text-xs text-slate-500">Within 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Invoices awaiting approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.pendingInvoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview.invoices.length}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        {overview.contractors.length === 0 ? (
          <EmptyState title="No contractors" description="Add a vendor before recording invoices." />
        ) : (
          <ContractorTable items={overview.contractors} />
        )}
      </div>
      {overview.recentInvoices.length ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Recent invoices</h2>
          <InvoiceTable items={overview.recentInvoices} />
        </div>
      ) : null}
    </div>
  );
}
