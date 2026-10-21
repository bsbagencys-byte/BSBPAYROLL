import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { buildBankFile } from "@/lib/payments/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "payments.export")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  try {
    const file = await buildBankFile(user.organization.id, id);
    return new Response(file.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Could not build bank file.", { status: 400 });
  }
}
