import { listAccountingExports, listAccounts, listJournalLines, listJournals, listMappings, getJournal } from "@/lib/accounting/repository";
import { loadOrgCatalog } from "@/lib/org-data";
import { lookupName } from "@/lib/utils";
import { getPayrollRun } from "@/lib/payroll/repository";

export async function loadAccountingOverview(organizationId: string) {
  const [accounts, mappings, journals, exports] = await Promise.all([
    listAccounts(organizationId),
    listMappings(organizationId),
    listJournals(organizationId),
    listAccountingExports(organizationId),
  ]);
  const accountById = new Map(accounts.map((row) => [row.id, row]));

  return {
    accounts,
    mappings: mappings.map((mapping) => ({
      mapping,
      accountCode: accountById.get(mapping.ledger_account_id)?.code ?? "—",
      accountName: accountById.get(mapping.ledger_account_id)?.name ?? "Missing account",
    })),
    journals,
    exports,
  };
}

export async function loadMappingCatalog(organizationId: string) {
  const [accounts, mappings, catalog] = await Promise.all([
    listAccounts(organizationId),
    listMappings(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  const accountById = new Map(accounts.map((row) => [row.id, row]));
  return {
    accounts,
    mappings: mappings.map((mapping) => ({
      mapping,
      accountCode: accountById.get(mapping.ledger_account_id)?.code ?? "—",
      accountName: accountById.get(mapping.ledger_account_id)?.name ?? "Missing account",
      branchName: lookupName(catalog.branches, mapping.branch_id),
      departmentName: lookupName(catalog.departments, mapping.department_id),
    })),
    branches: catalog.branches,
    departments: catalog.departments,
  };
}

export async function loadJournalDetail(organizationId: string, journalId: string) {
  const journal = await getJournal(organizationId, journalId);
  if (!journal) return null;
  const [lines, catalog, run, exports] = await Promise.all([
    listJournalLines(organizationId, journalId),
    loadOrgCatalog(organizationId),
    getPayrollRun(organizationId, journal.run_id),
    listAccountingExports(organizationId),
  ]);
  return {
    journal,
    run,
    lines,
    branches: catalog.branches,
    departments: catalog.departments,
    employees: catalog.employees,
    exports: exports.filter((row) => row.journal_id === journalId),
  };
}
