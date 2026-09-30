import { salaryCsvResponse } from "@/lib/salary/csv";

export async function GET() {
  return salaryCsvResponse("variable");
}
