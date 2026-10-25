import "server-only";

import { IntegrationError } from "@/lib/errors";
import { config } from "@/lib/config";
import type {
  RawTranscriptSegment,
  TranscriptionAdapter,
  TranscriptionInput,
  TranscriptionResult,
} from "./types";

interface DeepgramWord {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number;
}

interface DeepgramUtterance {
  transcript?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number;
}

interface DeepgramResponse {
  metadata?: { request_id?: string };
  results?: {
    channels?: Array<{
      detected_language?: string;
      language?: string;
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: DeepgramWord[];
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
  error?: string;
  err_msg?: string;
}

function labelForSpeaker(speaker: number | undefined): string {
  if (speaker === undefined || speaker === null || Number.isNaN(speaker)) {
    return "Person 1";
  }
  return `Person ${speaker + 1}`;
}

function parseUtterances(response: DeepgramResponse): RawTranscriptSegment[] {
  const utterances = response.results?.utterances;
  if (Array.isArray(utterances) && utterances.length > 0) {
    return utterances
      .filter((utterance) => (utterance.transcript ?? "").trim().length > 0)
      .map((utterance) => {
        const start = Math.max(0, utterance.start ?? 0);
        const end = Math.max(start, utterance.end ?? start);
        const speaker = utterance.speaker;
        return {
          startSeconds: Number(start.toFixed(3)),
          endSeconds: Number(end.toFixed(3)),
          speakerId: `speaker-${(speaker ?? 0) + 1}`,
          speakerLabel: labelForSpeaker(speaker),
          text: (utterance.transcript ?? "").trim(),
          confidence:
            typeof utterance.confidence === "number"
              ? Number(utterance.confidence.toFixed(3))
              : null,
        };
      });
  }

  const alternative = response.results?.channels?.[0]?.alternatives?.[0];
  const words = alternative?.words ?? [];
  if (!words.length) {
    const text = alternative?.transcript?.trim();
    if (!text) return [];
    return [
      {
        startSeconds: 0,
        endSeconds: 0,
        speakerId: "speaker-1",
        speakerLabel: "Person 1",
        text,
        confidence: alternative?.confidence ?? null,
      },
    ];
  }

  // Group consecutive words by speaker, splitting on long pauses.
  const groups: Array<{
    speaker: number | undefined;
    words: DeepgramWord[];
    start: number;
    end: number;
  }> = [];

  for (const word of words) {
    const speaker = word.speaker;
    const start = word.start ?? 0;
    const end = word.end ?? start;
    const current = groups[groups.length - 1];
    if (!current || current.speaker !== speaker || start - current.end > 2.5) {
      groups.push({ speaker, words: [word], start, end });
    } else {
      current.words.push(word);
      current.end = end;
    }
  }

  return groups.map((group) => {
    const text = group.words
      .map((word) => word.punctuated_word ?? word.word ?? "")
      .join(" ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
    const confidences = group.words
      .map((word) => word.confidence)
      .filter((value): value is number => typeof value === "number");
    return {
      startSeconds: Number(group.start.toFixed(3)),
      endSeconds: Number(group.end.toFixed(3)),
      speakerId: `speaker-${(group.speaker ?? 0) + 1}`,
      speakerLabel: labelForSpeaker(group.speaker),
      text,
      confidence: confidences.length
        ? Number(
            (
              confidences.reduce((sum, value) => sum + value, 0) /
              confidences.length
            ).toFixed(3),
          )
        : null,
    };
  });
}

export function createDeepgramAdapter(): TranscriptionAdapter {
  return {
    name: "deepgram",
    async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
      if (!config.deepgramKey) {
        throw new IntegrationError(
          "Deepgram is not configured. Set DEEPGRAM_API_KEY.",
          { code: "TRANSCRIPTION_NOT_CONFIGURED", status: 503 },
        );
      }

      const params = new URLSearchParams({
        model: config.deepgramModel,
        smart_format: "true",
        punctuate: "true",
        utterances: "true",
        diarize: "true",
        language: input.language === "multi" ? "multi" : input.language,
      });
      const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Token ${config.deepgramKey}`,
            "Content-Type": input.mimeType || "audio/wav",
          },
          body: new Uint8Array(input.buffer),
          signal: AbortSignal.timeout(240_000),
        });
      } catch (error) {
        throw new IntegrationError(
          "Could not reach Deepgram. Check the network and try again.",
          { code: "TRANSCRIPTION_UNREACHABLE" },
        );
      }

      const body = (await response.json().catch(() => null)) as
        | DeepgramResponse
        | null;

      if (!response.ok) {
        const providerMessage =
          body?.error ?? body?.err_msg ?? `HTTP ${response.status}`;
        throw new IntegrationError(
          `Deepgram transcription failed: ${String(providerMessage).slice(0, 240)}`,
          { code: "TRANSCRIPTION_FAILED", status: 502 },
        );
      }

      if (!body?.results) {
        throw new IntegrationError(
          "Deepgram returned an unexpected response without transcript results.",
          { code: "TRANSCRIPTION_BAD_RESPONSE" },
        );
      }

      const segments = parseUtterances(body);
      if (segments.length === 0) {
        throw new IntegrationError(
          "No speech was detected in this recording. Try a clearer recording or upload a different file.",
          { code: "TRANSCRIPTION_EMPTY", status: 422 },
        );
      }

      const channel = body.results.channels?.[0];
      return {
        segments,
        provider: "deepgram",
        model: config.deepgramModel,
        language:
          channel?.detected_language ?? channel?.language ?? input.language,
        diarized: true,
      };
    },
  };
}
