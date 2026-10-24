import { insertAiUsageLog } from "@/lib/analytics/repository";
import { toolsForQuestion, runAnalyticsTools, type AnalyticsToolName } from "@/lib/ai/tools";
import type { AnalyticsAssistantAnswer } from "@/types";

const FORBIDDEN = /(approve|finalize|calculate payroll|run payroll|pay now|execute sql|drop table|insert into|update payroll|edit salary)/i;

function configured() {
  return Boolean(process.env.USER_LLM_API_KEY && process.env.USER_LLM_BASE_URL);
}

function excerpt(question: string) {
  return question.trim().slice(0, 180);
}

function composeAnswer(question: string, tools: Awaited<ReturnType<typeof runAnalyticsTools>>): AnalyticsAssistantAnswer {
  const lines = tools.results.map((item) => item.text);
  const draftNote = tools.snapshot.current.draft
    ? " The selected payroll run is draft or in progress and is labelled as such."
    : "";
  return {
    status: "ANSWERED",
    answer: `Answered from stored analytics only.${draftNote} ${lines.join(" ")} This assistant cannot approve, calculate, finalize or edit payroll, claims, loans or payments.`,
    sources: tools.results.map((item) => item.name),
    toolsUsed: tools.results.map((item) => item.name),
  };
}

async function callModel(question: string, toolText: string) {
  const base = process.env.USER_LLM_BASE_URL?.replace(/\/$/, "");
  const key = process.env.USER_LLM_API_KEY;
  const model = process.env.USER_LLM_MODEL || "deepseek-chat";
  if (!base || !key) return null;
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a read-only payroll analytics narrator. Use only the tool results. Never invent numbers. Never approve, calculate, finalize or edit payroll. If data is missing, say so. Mention draft vs historical when the tools do.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nTool results:\n${toolText}`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Assistant provider returned ${response.status}.`);
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || null;
}

export async function askAnalyticsAssistant(input: {
  organizationId: string;
  timezone: string;
  userId: string | null;
  question: string;
  period?: string;
}): Promise<AnalyticsAssistantAnswer> {
  const question = input.question.trim();
  if (!question) {
    return { status: "FAILED", answer: "Enter a question about stored analytics.", sources: [], toolsUsed: [] };
  }
  if (FORBIDDEN.test(question)) {
    const blocked: AnalyticsAssistantAnswer = {
      status: "UNAVAILABLE",
      answer: "This assistant is read-only. It cannot approve, calculate, finalize or edit payroll, claims, loans or payments.",
      sources: [],
      toolsUsed: [],
    };
    await insertAiUsageLog({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      user_id: input.userId,
      question_excerpt: excerpt(question),
      tools_used_json: "[]",
      status: blocked.status,
      error_message: "forbidden_action",
      created_at: new Date().toISOString(),
    });
    return blocked;
  }

  const names = toolsForQuestion(question) as AnalyticsToolName[];
  const tools = await runAnalyticsTools(input.organizationId, input.timezone, input.period, names);
  const fallback = composeAnswer(question, tools);

  if (!configured()) {
    const answer: AnalyticsAssistantAnswer = {
      status: "UNCONFIGURED",
      answer:
        "The optional assistant is not configured. Set USER_LLM_API_KEY, USER_LLM_BASE_URL and USER_LLM_MODEL in the project environment. Deterministic analytics below still come from stored data. " +
        fallback.answer,
      sources: fallback.sources,
      toolsUsed: fallback.toolsUsed,
    };
    await insertAiUsageLog({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      user_id: input.userId,
      question_excerpt: excerpt(question),
      tools_used_json: JSON.stringify(answer.toolsUsed),
      status: "UNCONFIGURED",
      error_message: null,
      created_at: new Date().toISOString(),
    });
    return answer;
  }

  try {
    const modelText = await callModel(question, tools.results.map((item) => `${item.name}: ${item.text}`).join("\n"));
    const answer: AnalyticsAssistantAnswer = {
      status: "ANSWERED",
      answer: modelText || fallback.answer,
      sources: fallback.sources,
      toolsUsed: fallback.toolsUsed,
    };
    await insertAiUsageLog({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      user_id: input.userId,
      question_excerpt: excerpt(question),
      tools_used_json: JSON.stringify(answer.toolsUsed),
      status: "ANSWERED",
      error_message: null,
      created_at: new Date().toISOString(),
    });
    return answer;
  } catch (error) {
    const answer: AnalyticsAssistantAnswer = {
      status: "FAILED",
      answer: `${error instanceof Error ? error.message : "Assistant failed."} Deterministic analytics: ${fallback.answer}`,
      sources: fallback.sources,
      toolsUsed: fallback.toolsUsed,
    };
    await insertAiUsageLog({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      user_id: input.userId,
      question_excerpt: excerpt(question),
      tools_used_json: JSON.stringify(answer.toolsUsed),
      status: "FAILED",
      error_message: error instanceof Error ? error.message : "failed",
      created_at: new Date().toISOString(),
    });
    return answer;
  }
}
