import { payrollCsvResponse } from "@/lib/payroll/csv";

export async function GET() {
  return payrollCsvResponse("payslips");
}
