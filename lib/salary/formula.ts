const TOKEN = /[A-Z][A-Z0-9_]*|\d+(?:\.\d+)?|[+\-*/()]|\s+/g;
const IDENT = /^[A-Z][A-Z0-9_]*$/;
const NUMBER = /^\d+(?:\.\d+)?$/;

export const FORMULA_VARIABLES = [
  "BASIC",
  "HRA",
  "DA",
  "TA",
  "GROSS",
  "CTC",
  "WORKING_DAYS",
  "PRESENT_DAYS",
  "LOP_DAYS",
  "OT_HOURS",
] as const;

export type FormulaVariable = (typeof FORMULA_VARIABLES)[number];

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

export function tokenizeFormula(formula: string) {
  const source = formula.trim().toUpperCase();
  if (!source) return { error: "Formula is required.", tokens: [] as string[] };
  const tokens: string[] = [];
  let lastIndex = 0;
  const matches = source.matchAll(TOKEN);
  for (const match of matches) {
    if (match.index !== lastIndex) {
      return { error: `Unexpected character at position ${lastIndex + 1}.`, tokens: [] };
    }
    lastIndex = (match.index ?? 0) + match[0].length;
    const token = match[0];
    if (!token.trim()) continue;
    tokens.push(token);
  }
  if (lastIndex !== source.length) {
    return { error: `Unexpected character at position ${lastIndex + 1}.`, tokens: [] };
  }
  return { error: null, tokens };
}

export function validateFormula(formula: string, knownCodes: string[] = []) {
  const allowed = new Set<string>([...FORMULA_VARIABLES, ...knownCodes.map((code) => code.toUpperCase())]);
  const { error, tokens } = tokenizeFormula(formula);
  if (error) return { ok: false as const, error };
  if (!tokens.length) return { ok: false as const, error: "Formula is required." };

  let depth = 0;
  let expectValue = true;
  const identifiers: string[] = [];
  for (const token of tokens) {
    if (token === "(") {
      if (!expectValue) return { ok: false as const, error: "Unexpected '('." };
      depth += 1;
      continue;
    }
    if (token === ")") {
      if (expectValue || depth === 0) return { ok: false as const, error: "Unexpected ')'." };
      depth -= 1;
      continue;
    }
    if (token in PRECEDENCE) {
      if (expectValue) return { ok: false as const, error: `Unexpected operator ${token}.` };
      expectValue = true;
      continue;
    }
    if (NUMBER.test(token)) {
      if (!expectValue) return { ok: false as const, error: "Unexpected number." };
      expectValue = false;
      continue;
    }
    if (IDENT.test(token)) {
      if (!expectValue) return { ok: false as const, error: `Unexpected identifier ${token}.` };
      if (!allowed.has(token)) {
        return { ok: false as const, error: `Unknown variable ${token}.` };
      }
      identifiers.push(token);
      expectValue = false;
      continue;
    }
    return { ok: false as const, error: `Unsupported token ${token}.` };
  }
  if (expectValue) return { ok: false as const, error: "Formula ends unexpectedly." };
  if (depth !== 0) return { ok: false as const, error: "Unbalanced parentheses." };
  return { ok: true as const, identifiers };
}

function toRpn(tokens: string[]) {
  const output: string[] = [];
  const ops: string[] = [];
  for (const token of tokens) {
    if (NUMBER.test(token) || IDENT.test(token)) {
      output.push(token);
      continue;
    }
    if (token in PRECEDENCE) {
      while (ops.length && ops[ops.length - 1] in PRECEDENCE && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[token]) {
        output.push(ops.pop() as string);
      }
      ops.push(token);
      continue;
    }
    if (token === "(") {
      ops.push(token);
      continue;
    }
    if (token === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop() as string);
      if (!ops.length) throw new Error("Unbalanced parentheses.");
      ops.pop();
    }
  }
  while (ops.length) {
    const op = ops.pop() as string;
    if (op === "(" || op === ")") throw new Error("Unbalanced parentheses.");
    output.push(op);
  }
  return output;
}

export function evaluateFormula(formula: string, values: Record<string, number>, knownCodes: string[] = []) {
  const check = validateFormula(formula, knownCodes);
  if (!check.ok) return { ok: false as const, error: check.error, value: 0 };
  const { tokens } = tokenizeFormula(formula);
  const rpn = toRpn(tokens);
  const stack: number[] = [];
  for (const token of rpn) {
    if (NUMBER.test(token)) {
      stack.push(Number(token));
      continue;
    }
    if (IDENT.test(token)) {
      stack.push(Number(values[token] ?? 0));
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) return { ok: false as const, error: "Invalid formula.", value: 0 };
    if (token === "+") stack.push(left + right);
    else if (token === "-") stack.push(left - right);
    else if (token === "*") stack.push(left * right);
    else if (token === "/") {
      if (right === 0) return { ok: false as const, error: "Division by zero.", value: 0 };
      stack.push(left / right);
    }
  }
  if (stack.length !== 1) return { ok: false as const, error: "Invalid formula.", value: 0 };
  return { ok: true as const, error: null, value: stack[0] };
}

export function previewFormula(formula: string, sample: Record<string, number> = {}, knownCodes: string[] = []) {
  const defaults: Record<string, number> = {
    BASIC: 30000,
    HRA: 12000,
    DA: 3000,
    TA: 1600,
    GROSS: 51000,
    CTC: 612000,
    WORKING_DAYS: 26,
    PRESENT_DAYS: 24,
    LOP_DAYS: 0,
    OT_HOURS: 0,
    ...sample,
  };
  const check = validateFormula(formula, knownCodes);
  if (!check.ok) return { ok: false as const, error: check.error, value: null as number | null };
  const result = evaluateFormula(formula, defaults, knownCodes);
  if (!result.ok) return { ok: false as const, error: result.error, value: null as number | null };
  return { ok: true as const, error: null, value: Math.round(result.value * 100) / 100 };
}
