import { toCsv } from "@/lib/payroll/engine";
import type { PayrollJournal, PayrollJournalLine } from "@/types";

export function journalCsvRows(input: {
  journal: PayrollJournal;
  lines: PayrollJournalLine[];
  branchName: (id: string | null) => string | null;
  departmentName: (id: string | null) => string | null;
}) {
  const { journal, lines } = input;
  return lines.map((line) => [
    journal.journal_date,
    journal.reference_number,
    line.account_code,
    line.account_name,
    line.description,
    input.branchName(line.branch_id) ?? "",
    input.departmentName(line.department_id) ?? "",
    line.debit,
    line.credit,
    journal.period,
    journal.run_id,
  ]);
}

export function journalCsv(input: {
  journal: PayrollJournal;
  lines: PayrollJournalLine[];
  branchName: (id: string | null) => string | null;
  departmentName: (id: string | null) => string | null;
}) {
  return toCsv(
    [
      "Journal Date",
      "Reference Number",
      "Account Code",
      "Account Name",
      "Description",
      "Branch",
      "Department",
      "Debit",
      "Credit",
      "Payroll Period",
      "Source Payroll Run",
    ],
    journalCsvRows(input)
  );
}
