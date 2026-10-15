import { contractorsCsvResponse } from "@/lib/exits/csv";

export async function GET() {
  return contractorsCsvResponse("invoices");
}
