export const DEFAULT_BANK_COLUMNS = [
  { key: "employee_code", header: "Employee Code" },
  { key: "account_holder_name", header: "Beneficiary Name" },
  { key: "account_number", header: "Account Number" },
  { key: "ifsc", header: "IFSC" },
  { key: "amount", header: "Amount" },
  { key: "reference", header: "Payment Reference" },
  { key: "remarks", header: "Remarks" },
] as const;

export type BankColumnKey = (typeof DEFAULT_BANK_COLUMNS)[number]["key"];
