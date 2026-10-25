import "server-only";

import { config, ConfigurationError, requireIntegration } from "@/lib/config";
import { IntegrationError } from "@/lib/errors";
import { REPORT_SYSTEM_PROMPT, buildReportUserPrompt } from "@/lib/ai/prompt";
import { aiReportSchema, type AiReport } from "@/lib/validation/schemas";
import { reconcileReport, type ReconciledReport } from "@/lib/ai/report";
import type { Meeting, TranscriptSegment } from "@/types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
    text?: string;
  }>;
  error?: { message?: string } | string;
}

function chatUrl(): string {
  const base = config.gemmaUrl?.replace(/\/+$/, "");
  if (!base) {
    throw new ConfigurationError(
      "Gemma is not configured. Set GEMMA_API_URL to an OpenAI-compatible endpoint.",
    );
  }
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

function contentOf(response: ChatCompletionResponse): string {
  const message = response.choices?.[0]?.message?.content;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message.map((part) => part.text ?? "").join("");
  }
  return response.choices?.[0]?.text ?? "";
}

function extractJson(content: string): string {
  const withoutFence = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("The model response did not contain a JSON object.");
  }
  return withoutFence.slice(first, last + 1);
}

async function requestReport(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(chatUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.gemmaKey
          ? { Authorization: `Bearer ${config.gemmaKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: config.gemmaModel,
        messages,
        temperature: 0.15,
        max_tokens: 6_000,
        stream: false,
      }),
      signal: AbortSignal.timeout(config.gemmaTimeoutMs),
    });
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    const aborted = (error as Error)?.name === "TimeoutError";
    throw new IntegrationError(
      aborted
        ? "Gemma took too long to respond. Try again, or use a shorter recording."
        : "Could not reach the Gemma endpoint. Check GEMMA_API_URL and the inference server.",
      { code: aborted ? "GEMMA_TIMEOUT" : "GEMMA_UNREACHABLE" },
    );
  }

  const body = (await response.json().catch(() => null)) as
    | ChatCompletionResponse
    | null;

  if (!response.ok) {
    const providerMessage =
      typeof body?.error === "string"
        ? body.error
        : body?.error?.message ?? `HTTP ${response.status}`;
    throw new IntegrationError(
      `Gemma report generation failed: ${String(providerMessage).slice(0, 240)}`,
      { code: "GEMMA_FAILED" },
    );
  }

  const content = contentOf(body ?? {});
  if (!content.trim()) {
    throw new IntegrationError(
      "Gemma returned an empty response. Check that the endpoint serves a chat model.",
      { code: "GEMMA_EMPTY" },
    );
  }
  return content;
}

export interface GemmaReportResult extends ReconciledReport {
  model: string;
  truncatedTranscript: boolean;
}

export async function generateGemmaReport(
  meeting: Meeting,
  segments: TranscriptSegment[],
): Promise<GemmaReportResult> {
  requireIntegration("gemma");
  if (segments.length === 0) {
    throw new IntegrationError(
      "There is no transcript to analyze. Transcribe the recording first.",
      { code: "NO_TRANSCRIPT", status: 422 },
    );
  }

  const { prompt, truncated } = buildReportUserPrompt(meeting, segments);
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: REPORT_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  let rawReport: AiReport | null = null;
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = await requestReport(messages);
    try {
      const parsed = JSON.parse(extractJson(content));
      const validated = aiReportSchema.parse(parsed);
      if (!validated.executiveSummary.purpose.trim()) {
        throw new Error("The report is missing an executive-summary purpose.");
      }
      if (
        validated.discussionPoints.length === 0 &&
        validated.decisions.length === 0 &&
        validated.actionItems.length === 0
      ) {
        throw new Error("The report contains no discussion, decisions, or action items.");
      }
      rawReport = validated;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Invalid JSON";
      messages.push({ role: "assistant", content: content.slice(0, 6_000) });
      messages.push({
        role: "user",
        content: `Your previous response was invalid: ${lastError.slice(0, 300)}. Return the complete corrected JSON object only, following the required shape exactly.`,
      });
    }
  }

  if (!rawReport) {
    throw new IntegrationError(
      `Gemma returned a report that could not be validated. ${lastError.slice(0, 180)}`,
      { code: "GEMMA_INVALID_REPORT" },
    );
  }

  const reconciled = reconcileReport(rawReport, segments);
  if (truncated) {
    reconciled.report.validationWarnings.push(
      "The transcript exceeded the analysis context window; only the first portion was analyzed.",
    );
  }

  return {
    ...reconciled,
    model: config.gemmaModel,
    truncatedTranscript: truncated,
  };
}
