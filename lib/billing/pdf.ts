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

export function buildBillingInvoicePdf(input: {
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  dueDate: string;
  period: string;
  sellerName: string;
  sellerAddress: string;
  sellerTax: string;
  customerName: string;
  customerAddress: string;
  customerTax: string;
  lines: Array<{ description: string; amount: string }>;
  subtotal: string;
  taxLabel: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  outstanding: string;
  currency: string;
  notes: string;
  taxConfigured: boolean;
}) {
  const lines: string[] = [];
  let y = 800;
  const add = (text: string, size = 10, x = 48) => {
    lines.push(`BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`);
    y -= size + 6;
  };
  add("BSB Payroll — Subscription invoice", 14);
  add(`Invoice ${input.invoiceNumber}    Status ${input.status}`, 11);
  add(`Issued ${input.issuedAt}    Due ${input.dueDate}    Period ${input.period}`, 9);
  y -= 6;
  add("Seller", 11);
  add(input.sellerName, 10);
  for (const row of wrap(input.sellerAddress, 78)) add(row, 9);
  if (input.sellerTax) add(input.sellerTax, 9);
  y -= 6;
  add("Bill to", 11);
  add(input.customerName, 10);
  for (const row of wrap(input.customerAddress, 78)) add(row, 9);
  if (input.customerTax) add(input.customerTax, 9);
  y -= 8;
  add("Lines", 11);
  for (const row of input.lines) {
    lines.push(`BT /F1 9 Tf 60 ${y} Td (${pdfEscape(row.description.slice(0, 70))}) Tj ET`);
    lines.push(`BT /F1 9 Tf 420 ${y} Td (${pdfEscape(row.amount)}) Tj ET`);
    y -= 14;
  }
  y -= 6;
  add(`Subtotal  ${input.subtotal}`, 10);
  add(`${input.taxLabel}  ${input.taxAmount}`, 10);
  add(`Total  ${input.total} ${input.currency}`, 12);
  add(`Amount paid  ${input.amountPaid}    Outstanding  ${input.outstanding}`, 10);
  y -= 8;
  if (!input.taxConfigured) {
    add("Tax configuration is incomplete. This document does not claim GST-compliant tax.", 8);
  }
  for (const row of wrap(input.notes || "Subscription billing is separate from employee salary payments.", 78)) {
    add(row, 8);
  }

  const content = lines.join("\n");
  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push(
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj"
  );
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
  return Buffer.from(
    `%PDF-1.4\n${body.join("\n")}\n${xref.join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`,
    "utf8"
  );
}
