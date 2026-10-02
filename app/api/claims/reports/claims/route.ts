import { claimsCsvResponse } from "@/lib/claims/csv";

export async function GET() {
  return claimsCsvResponse("claims");
}
