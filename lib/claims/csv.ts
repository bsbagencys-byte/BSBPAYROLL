import { getSessionUser, hasPermission } from "@/lib/auth/session";
import { toCsv } from "@/lib/claims/engine";
import {
  loadBenefitOverview,
  loadClaimListItems,
  toBenefitAssignmentRows,
  loadClaimsCatalog,
} from "@/lib/claims/query";
import { BENEFIT_CATEGORY_LABELS, CLAIM_CATEGORY_LABELS, CLAIM_STATUS_LABELS } from "@/lib/constants";

export async function claimsCsvResponse(
  kind: "claims" | "approved" | "pending" | "benefits" | "assignments" | "policies"
) {
  const user = await getSessionUser();
  const benefitKind = kind === "benefits" || kind === "assignments";
  const allowed = benefitKind
    ? hasPermission(user, "benefits.view")
    : hasPermission(user, "claims.view") || hasPermission(user, "claims.export");
  if (!user || !allowed) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = user.organization.id;
  let csv = "";
  let filename = "claims.csv";

  if (kind === "claims" || kind === "approved" || kind === "pending") {
    const items = await loadClaimListItems(orgId);
    const filtered =
      kind === "approved"
        ? items.filter((item) => item.claim.status === "APPROVED")
        : kind === "pending"
          ? items.filter((item) => item.claim.status === "SUBMITTED" || item.claim.status === "PENDING_APPROVAL")
          : items;
    csv = toCsv(
      ["Reference", "Employee", "Code", "Type", "Category", "Claim Date", "Period", "Submitted", "Approved", "Status", "Step", "Receipts"],
      filtered.map((item) => [
        item.claim.reference_number,
        item.employeeName,
        item.employeeCode,
        item.claimTypeName,
        CLAIM_CATEGORY_LABELS[item.category] ?? item.category,
        item.claim.claim_date,
        item.claim.period_from ? `${item.claim.period_from} – ${item.claim.period_to ?? item.claim.period_from}` : "",
        item.claim.submitted_amount,
        item.claim.approved_amount,
        CLAIM_STATUS_LABELS[item.claim.status],
        item.claim.current_step ?? "",
        item.receiptCount,
      ])
    );
    filename = kind === "claims" ? "claims.csv" : `claims-${kind}.csv`;
  } else if (kind === "benefits") {
    const overview = await loadBenefitOverview(orgId);
    csv = toCsv(
      ["Name", "Code", "Category", "Method", "Frequency", "Tax", "In CTC", "In Gross", "Status"],
      overview.types.map((item) => [
        item.name,
        item.code,
        BENEFIT_CATEGORY_LABELS[item.category] ?? item.category,
        item.calculation_method,
        item.frequency,
        item.tax_treatment,
        item.include_in_ctc ? "Yes" : "No",
        item.include_in_gross ? "Yes" : "No",
        item.status,
      ])
    );
    filename = "benefit-types.csv";
  } else if (kind === "assignments") {
    const overview = await loadBenefitOverview(orgId);
    const rows = toBenefitAssignmentRows({
      assignments: overview.assignments,
      types: overview.types,
      employees: overview.employees,
      departments: overview.departments,
      employment: overview.employment,
    });
    csv = toCsv(
      ["Employee", "Code", "Benefit", "Amount", "Method", "Effective From", "Effective To", "Status"],
      rows.map((item) => [
        item.employeeName,
        item.employeeCode,
        item.benefitName,
        item.amount,
        item.calculation_method,
        item.effective_from,
        item.effective_to,
        item.status,
      ])
    );
    filename = "employee-benefits.csv";
  } else {
    const catalog = await loadClaimsCatalog(orgId);
    csv = toCsv(
      ["Name", "Type", "Designation", "City", "Travel", "DA / Day", "Mileage", "Hotel", "Meal", "Max Amount", "Max Days", "Effective From", "Effective To", "Status"],
      catalog.policies.map((item) => [
        item.name,
        catalog.types.find((type) => type.id === item.claim_type_id)?.name ?? "Any",
        catalog.designations.find((row) => row.id === item.designation_id)?.name ?? "",
        item.city_category ?? "",
        item.travel_type ?? "",
        item.da_per_day,
        item.mileage_rate,
        item.hotel_limit,
        item.meal_limit,
        item.max_amount,
        item.max_days,
        item.effective_from,
        item.effective_to,
        item.status,
      ])
    );
    filename = "claim-policies.csv";
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
