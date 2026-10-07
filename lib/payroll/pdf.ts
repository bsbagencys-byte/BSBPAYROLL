function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildPayslipPdf(input: {
  organizationName: string;
  organizationAddress: string;
  payslipNumber: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  periodLabel: string;
  payDate: string;
  workingDays: string;
  paidDays: string;
  lopDays: string;
  earnings: Array<{ name: string; amount: string }>;
  reimbursements: Array<{ name: string; amount: string }>;
  deductions: Array<{ name: string; amount: string }>;
  statutoryReserved: Array<{ name: string; amount: string }>;
  gross: string;
  reimbursementTotal: string;
  deductionTotal: string;
  netBeforeStatutory: string;
  generatedAt: string;
}) {
  const lines: string[] = [];
  let y = 800;
  const add = (text: string, size = 10, x = 48) => {
    lines.push(`BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`);
    y -= size + 6;
  };
  add(input.organizationName, 16);
  for (const row of wrap(input.organizationAddress, 78)) add(row, 9);
  y -= 4;
  add(`Payslip ${input.payslipNumber}`, 12);
  add(`Period ${input.periodLabel}    Pay date ${input.payDate}`, 10);
  add(`Generated ${input.generatedAt}`, 9);
  y -= 6;
  add(`Employee  ${input.employeeName} (${input.employeeCode})`, 10);
  add(`Department  ${input.department}    Designation  ${input.designation}`, 10);
  add(`Working days  ${input.workingDays}    Paid days  ${input.paidDays}    LOP  ${input.lopDays}`, 10);
  y -= 8;

  const table = (title: string, rows: Array<{ name: string; amount: string }>) => {
    add(title, 11);
    if (!rows.length) {
      add("None", 9, 60);
      return;
    }
    for (const row of rows) {
      lines.push(`BT /F1 9 Tf 60 ${y} Td (${pdfEscape(row.name)}) Tj ET`);
      lines.push(`BT /F1 9 Tf 420 ${y} Td (${pdfEscape(row.amount)}) Tj ET`);
      y -= 14;
    }
    y -= 4;
  };

  table("Earnings", input.earnings);
  table("Reimbursements", input.reimbursements);
  table("Deductions", input.deductions);
  table("Statutory (reserved — Phase 11)", input.statutoryReserved);
  y -= 6;
  add(`Gross  ${input.gross}`, 11);
  add(`Reimbursements  ${input.reimbursementTotal}`, 10);
  add(`Current deductions  ${input.deductionTotal}`, 10);
  add(`Net before statutory  ${input.netBeforeStatutory}`, 12);
  y -= 10;
  add("PF, ESI, PT, TDS and LWF are reserved and not calculated in this phase.", 8);

  const content = lines.join("\n");
  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj");
  objects.push(`4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`);
  objects.push("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  let offset = 9;
  const xref = ["xref", "0 6", "0000000000 65535 f "];
  const body: string[] = [];
  for (const object of objects) {
    xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
    body.push(object);
    offset += object.length + 1;
  }
  const pdf = `%PDF-1.4\n${body.join("\n")}\n${xref.join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
