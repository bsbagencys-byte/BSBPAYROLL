import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, reports: ["requests", "balances", "holidays", "attendance"] });
}
