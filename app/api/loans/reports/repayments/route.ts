import { loansCsvResponse } from "@/lib/loans/csv";

export async function GET() {
  return loansCsvResponse("repayments");
}
