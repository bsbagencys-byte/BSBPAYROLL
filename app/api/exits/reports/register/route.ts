import { exitsCsvResponse } from "@/lib/exits/csv";

export async function GET() {
  return exitsCsvResponse("register");
}
