import { settlementsCsvResponse } from "@/lib/exits/csv";

export async function GET() {
  return settlementsCsvResponse("register");
}
