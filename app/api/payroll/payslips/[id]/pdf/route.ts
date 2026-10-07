import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { loadOrgCatalog } from "@/lib/org-data";
import { getPayslip } from "@/lib/payroll/repository";
import { loadPayslipPdf } from "@/lib/payroll/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!(hasPermission(user, "payroll.payslip.view") || hasPermission(user, "payslip.export"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const payslip = await getPayslip(user.organization.id, id);
  if (!payslip) return new Response("Not found", { status: 404 });
  if (!hasPermission(user, "payroll.view")) {
    const catalog = await loadOrgCatalog(user.organization.id);
    const own = catalog.employees.find((item) => item.user_id === user.id);
    if (!own || own.id !== payslip.employee_id) return new Response("Not found", { status: 404 });
  }
  const pdf = await loadPayslipPdf(user.organization.id, payslip);
  if (!pdf) return new Response("Payslip PDF is not available.", { status: 404 });
  const filename = `${payslip.payslip_number || "payslip"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
