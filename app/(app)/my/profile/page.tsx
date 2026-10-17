import { PageHeader } from "@/components/layout/app-shell";
import { ChangeRequestForm } from "@/components/ess/change-request-form";
import { ChangeRequestList } from "@/components/ess/change-request-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { resolveSelfEmployee } from "@/lib/ess/identity";
import { loadSelfChangeRequests, loadSelfDocuments } from "@/lib/ess/query";
import { maskAccountNumber, maskAadhaarLast4, maskIdentifier, maskPan } from "@/lib/mask";
import { formatDateOnly } from "@/lib/utils";
import { EMPLOYEE_STATUS_LABELS, GENDER_LABELS, type Gender } from "@/lib/constants";

export const metadata = { title: "My profile" };

export default async function MyProfilePage() {
  const user = await requirePermissionOrRedirect("self.view");
  const identity = await resolveSelfEmployee(user);
  if (!identity) return null;

  const [record, changeRequests] = await Promise.all([
    loadSelfDocuments(user.organization.id, identity.employee.id),
    loadSelfChangeRequests(user.organization.id, user.id, identity.employee.id),
  ]);
  const canSubmit = hasPermission(user, "self.profile.update");
  const employee = record?.employee ?? identity.employee;

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Review your personal details. Sensitive identifiers are masked; corrections are made through a change request reviewed by HR."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Employee code" value={employee.employee_code} />
            <Field label="Full name" value={employee.display_name} />
            <Field label="Gender" value={GENDER_LABELS[employee.gender as Gender] ?? employee.gender} />
            <Field label="Date of birth" value={employee.date_of_birth ? formatDateOnly(employee.date_of_birth) : "—"} />
            <Field label="Mobile" value={employee.mobile ?? "—"} />
            <Field label="Personal email" value={employee.personal_email ?? "—"} />
            <Field label="Official email" value={record?.employment?.official_email ?? "—"} />
            <Field label="Status" value={EMPLOYEE_STATUS_LABELS[employee.status]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & emergency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Address" value={record?.address?.address_line1 ?? "—"} />
            <Field label="City / State" value={[record?.address?.city, record?.address?.state].filter(Boolean).join(", ") || "—"} />
            <Field label="PIN" value={record?.address?.pin ?? "—"} />
            <Field label="Emergency contact" value={employee.emergency_contact_name ?? "—"} />
            <Field label="Emergency number" value={employee.emergency_contact_number ?? "—"} />
            <Field label="Relationship" value={employee.emergency_relationship ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Bank account</CardTitle>
            <Badge variant="muted">Masked</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Account holder" value={record?.bank?.account_holder_name ?? "—"} />
            <Field label="Bank" value={record?.bank?.bank_name ?? "—"} />
            <Field label="Account number" value={maskAccountNumber(record?.bank?.account_number)} />
            <Field label="IFSC" value={record?.bank?.ifsc ?? "—"} />
            <Field label="Branch" value={record?.bank?.branch_name ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Statutory identifiers</CardTitle>
            <Badge variant="muted">Masked</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="PAN" value={maskPan(record?.statutory?.pan)} />
            <Field label="Aadhaar" value={maskAadhaarLast4(record?.statutory?.aadhaar_last4)} />
            <Field label="UAN" value={maskIdentifier(record?.statutory?.uan)} />
            <Field label="ESIC number" value={maskIdentifier(record?.statutory?.esic_number)} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChangeRequestForm canSubmit={canSubmit} />
        <ChangeRequestList rows={changeRequests} mode="self" timezone={user.organization.timezone} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
