export async function GET() {
  return Response.json({ ok: true, status: "live", timestamp: new Date().toISOString() });
}
