import { PageHeader } from "@/components/layout/app-shell";
import { AnalyticsSubnav } from "@/components/analytics/subnav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermissionOrRedirect } from "@/lib/auth/guards";
import { AssistantForm } from "@/components/analytics/assistant-form";
import { listAiUsageLogs } from "@/lib/analytics/repository";
import { currentPeriod } from "@/lib/payroll/engine";

export const metadata = { title: "Analytics assistant" };

export default async function AnalyticsAssistantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermissionOrRedirect("analytics.assistant.use");
  await searchParams;
  const logs = await listAiUsageLogs(user.organization.id, user.id);
  const configured = Boolean(process.env.USER_LLM_API_KEY && process.env.USER_LLM_BASE_URL);

  return (
    <div>
      <PageHeader
        title="Analytics assistant"
        description="Optional and permission-aware. Answers come from read-only analytics tools. It cannot approve, calculate, finalize or edit payroll."
      />
      <AnalyticsSubnav />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
        </CardHeader>
        <CardContent>
          {configured ? (
            <Badge variant="success">Provider configured</Badge>
          ) : (
            <p className="mb-3 text-sm text-amber-800">
              Assistant is unconfigured. Set USER_LLM_API_KEY, USER_LLM_BASE_URL and USER_LLM_MODEL. Deterministic stored-data answers still run.
            </p>
          )}
          <AssistantForm period={currentPeriod(user.organization.timezone)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent questions</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No questions yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.slice(0, 12).map((row) => (
                <li key={row.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <span>{row.question_excerpt}</span>
                    <Badge variant={row.status === "ANSWERED" ? "success" : row.status === "UNCONFIGURED" ? "warning" : "muted"}>
                      {row.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{row.created_at.slice(0, 16)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
