export function exitBlocksOrdinaryPayroll(
  item: { employee_id: string; status: string; last_working_date: string },
  employeeId: string,
  periodFrom: string
) {
  return (
    item.employee_id === employeeId &&
    item.status !== "DRAFT" &&
    item.status !== "SUBMITTED" &&
    item.status !== "CANCELLED" &&
    item.last_working_date < periodFrom
  );
}
