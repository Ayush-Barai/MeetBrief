import "server-only";

import { config, requireIntegration } from "@/lib/config";
import { IntegrationError } from "@/lib/errors";

export function buildRecapScript(input: {
  title: string;
  report: {
    executiveSummary: { purpose: string; keyOutcomes: string[]; takeaways: string[] };
    decisions: Array<{ description: string; status: string }>;
    openQuestions: Array<{ question: string }>;
  };
  actionItems: Array<{ task: string; owner: string; deadline: string }>;
}): string {
  const parts: string[] = [];
  parts.push(`Here is your MeetBrief recap for ${input.title}.`);

  const purpose = input.report.executiveSummary.purpose.trim();
  if (purpose) parts.push(`Purpose. ${purpose}`);

  const outcomes = input.report.executiveSummary.keyOutcomes.filter(Boolean);
  const takeaways = input.report.executiveSummary.takeaways.filter(Boolean);
  const highlights = [...outcomes, ...takeaways].slice(0, 4);
  if (highlights.length) {
    parts.push(`The most important takeaways. ${highlights.join(" ")}`);
  }

  const decisions = input.report.decisions
    .filter((decision) => decision.description.trim())
    .slice(0, 5);
  if (decisions.length) {
    const spoken = decisions
      .map(
        (decision) =>
          `${decision.description}${decision.status === "tentative" ? " This is tentative." : ""}`,
      )
      .join(" ");
    parts.push(`Decisions. ${spoken}`);
  } else {
    parts.push("No firm decisions were recorded.");
  }

  const actions = input.actionItems.slice(0, 8);
  if (actions.length) {
    const spoken = actions
      .map((action) => {
        const owner = action.owner === "Unassigned" ? "unassigned" : `assigned to ${action.owner}`;
        const deadline =
          action.deadline === "Not specified"
            ? "no deadline specified"
            : `due ${action.deadline}`;
        return `${action.task}, ${owner}, ${deadline}.`;
      })
      .join(" ");
    parts.push(`Action items. ${spoken}`);
  } else {
    parts.push("There were no action items.");
  }

  const questions = input.report.openQuestions
    .map((question) => question.question)
    .filter(Boolean)
    .slice(0, 4);
  if (questions.length) parts.push(`Open questions. ${questions.join(" ")}`);

  parts.push("That is your recap. Open MeetBrief for the full report and transcript.");

  const script = parts.join("\n\n").replace(/\s+/g, " ").trim();
  return script.length > 4_900 ? `${script.slice(0, 4_850).trim()}…` : script;
}

export async function generateElevenLabsAudio(script: string): Promise<Buffer> {
  requireIntegration("elevenlabs");
  if (!config.elevenLabsKey || !config.elevenLabsVoiceId) {
    throw new IntegrationError(
      "ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.",
      { code: "ELEVENLABS_NOT_CONFIGURED", status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.elevenLabsVoiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: script,
          model_id: config.elevenLabsModelId,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
  } catch {
    throw new IntegrationError(
      "Could not reach ElevenLabs. Check the network and try again.",
      { code: "ELEVENLABS_UNREACHABLE" },
    );
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    const body = (await response.json().catch(() => null)) as
      | { detail?: { message?: string } | string; message?: string }
      | null;
    if (typeof body?.detail === "string") message = body.detail;
    else if (body?.detail?.message) message = body.detail.message;
    else if (body?.message) message = body.message;

    const friendly =
      response.status === 401
        ? "ElevenLabs rejected the API key. Check ELEVENLABS_API_KEY."
        : response.status === 429
          ? "ElevenLabs rate limit reached. Wait a moment and regenerate."
          : `ElevenLabs audio generation failed: ${message.slice(0, 200)}`;
    throw new IntegrationError(friendly, {
      code: "ELEVENLABS_FAILED",
      status: response.status === 429 ? 429 : 502,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 1_000) {
    throw new IntegrationError(
      "ElevenLabs returned an unexpectedly small audio file.",
      { code: "ELEVENLABS_BAD_AUDIO" },
    );
  }
  return Buffer.from(arrayBuffer);
}
