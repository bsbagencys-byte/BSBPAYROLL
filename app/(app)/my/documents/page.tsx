import { PageHeader } from "@/components/layout/app-shell";
import { EssDocumentList } from "@/components/ess/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfDocuments } from "@/lib/ess/query";

export const metadata = { title: "My documents" };

export default async function MyDocumentsPage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const record = await loadSelfDocuments(user.organization.id, identity.employee.id);
  const documents = (record?.documents ?? []).filter((item) => item.status === "ACTIVE");

  return (
    <div>
      <PageHeader
        title="My documents"
        description="Documents on your employee record. Downloads use short-lived signed links and are limited to your own record."
      />
      <Card>
        <CardHeader>
          <CardTitle>On file</CardTitle>
        </CardHeader>
        <CardContent>
          <EssDocumentList documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}
