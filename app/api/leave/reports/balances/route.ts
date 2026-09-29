import { leaveCsvResponse } from "@/lib/leave/csv";

export async function GET() {
  return leaveCsvResponse("balances");
}
