import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { journalCsv } from "@/lib/accounting/csv";
import { loadJournalDetail } from "@/lib/accounting/query";
import { lookupName } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !(hasPermission(user, "accounting.journal.export") || hasPermission(user, "accounting.journal.view"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const detail = await loadJournalDetail(user.organization.id, id);
  if (!detail) return new Response("Not found", { status: 404 });
  const csv = journalCsv({
    journal: detail.journal,
    lines: detail.lines,
    branchName: (branchId) => lookupName(detail.branches, branchId),
    departmentName: (departmentId) => lookupName(detail.departments, departmentId),
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${detail.journal.reference_number}.csv"`,
    },
  });
}
