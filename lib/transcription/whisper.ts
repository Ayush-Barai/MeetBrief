import "server-only";

import { config } from "@/lib/config";
import { IntegrationError } from "@/lib/errors";
import type {
  TranscriptionAdapter,
  TranscriptionInput,
  TranscriptionResult,
} from "./types";

interface WhisperSegment {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
  avg_logprob?: number;
  no_speech_prob?: number;
}

interface WhisperResponse {
  text?: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}

function transcriptionUrl(): string {
  const base = config.transcriptionApiUrl.replace(/\/+$/, "");
  if (base.endsWith("/audio/transcriptions")) return base;
  return `${base}/audio/transcriptions`;
}

export function createWhisperAdapter(): TranscriptionAdapter {
  return {
    name: "whisper",
    async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
      if (!config.transcriptionApiKey) {
        throw new IntegrationError(
          "The transcription endpoint is not configured. Set TRANSCRIPTION_API_KEY.",
          { code: "TRANSCRIPTION_NOT_CONFIGURED", status: 503 },
        );
      }

      const form = new FormData();
      const blob = new Blob([new Uint8Array(input.buffer)], {
        type: input.mimeType || "audio/wav",
      });
      form.append("file", blob, input.filename);
      form.append("model", config.transcriptionModel);
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "segment");
      if (input.language !== "multi") form.append("language", input.language);

      let response: Response;
      try {
        response = await fetch(transcriptionUrl(), {
          method: "POST",
          headers: { Authorization: `Bearer ${config.transcriptionApiKey}` },
          body: form,
          signal: AbortSignal.timeout(240_000),
        });
      } catch {
        throw new IntegrationError(
          "Could not reach the transcription endpoint. Check the network and try again.",
          { code: "TRANSCRIPTION_UNREACHABLE" },
        );
      }

      const body = (await response.json().catch(() => null)) as
        | (WhisperResponse & { error?: { message?: string } | string })
        | null;

      if (!response.ok) {
        const providerMessage =
          typeof body?.error === "string"
            ? body.error
            : body?.error?.message ?? `HTTP ${response.status}`;
        throw new IntegrationError(
          `Transcription failed: ${String(providerMessage).slice(0, 240)}`,
          { code: "TRANSCRIPTION_FAILED" },
        );
      }

      const rawSegments = body?.segments?.length
        ? body.segments
        : body?.text
          ? [
              {
                start: 0,
                end: body.duration ?? 0,
                text: body.text,
              },
            ]
          : [];

      const segments = rawSegments
        .filter((segment) => (segment.text ?? "").trim().length > 0)
        .map((segment) => {
          const start = Math.max(0, segment.start ?? 0);
          const end = Math.max(start, segment.end ?? start);
          // Whisper log probabilities are not calibrated confidence scores.
          // Expose a conservative heuristic only when both signals exist.
          const confidence =
            typeof segment.avg_logprob === "number"
              ? Math.max(0, Math.min(1, Math.exp(segment.avg_logprob)))
              : null;
          return {
            startSeconds: Number(start.toFixed(3)),
            endSeconds: Number(end.toFixed(3)),
            speakerId: "speaker-1",
            speakerLabel: "Person 1",
            text: (segment.text ?? "").trim(),
            confidence:
              confidence === null ? null : Number(confidence.toFixed(3)),
          };
        });

      if (segments.length === 0) {
        throw new IntegrationError(
          "No speech was detected in this recording. Try a clearer recording or upload a different file.",
          { code: "TRANSCRIPTION_EMPTY", status: 422 },
        );
      }

      return {
        segments,
        provider: "whisper",
        model: config.transcriptionModel,
        language: body?.language ?? input.language,
        diarized: false,
      };
    },
  };
}
