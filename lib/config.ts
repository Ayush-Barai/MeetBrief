import type { IntegrationStatus } from "@/types";
import { SESSION_SECRET_FALLBACK } from "@/lib/auth/constants";

const bool = (value: string | undefined) => Boolean(value && value.trim().length > 0);

export function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const config = {
  appUrl: env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  sessionSecret:
    env("SESSION_SECRET") ?? SESSION_SECRET_FALLBACK,
  maxUploadBytes: Math.min(
    Math.max(Number(env("MAX_UPLOAD_MB") ?? 60), 1),
    200,
  ) * 1024 * 1024,
  mongoUri: env("MONGODB_URI"),
  mongoDbName: env("MONGODB_DB_NAME") ?? "meetbrief",
  transcriptionProvider:
    env("TRANSCRIPTION_PROVIDER")?.toLowerCase() ?? "deepgram",
  deepgramKey: env("DEEPGRAM_API_KEY") ?? env("TRANSCRIPTION_API_KEY"),
  deepgramModel: env("DEEPGRAM_MODEL") ?? "nova-3",
  transcriptionApiUrl:
    env("TRANSCRIPTION_API_URL") ?? "https://api.openai.com/v1",
  transcriptionApiKey: env("TRANSCRIPTION_API_KEY") ?? env("DEEPGRAM_API_KEY"),
  transcriptionModel: env("TRANSCRIPTION_MODEL") ?? "whisper-1",
  gemmaUrl: env("GEMMA_API_URL"),
  gemmaKey: env("GEMMA_API_KEY"),
  gemmaModel: env("GEMMA_MODEL") ?? "gemma3:27b",
  gemmaTimeoutMs: Math.min(
    Math.max(Number(env("GEMMA_TIMEOUT_MS") ?? 180_000), 10_000),
    600_000,
  ),
  elevenLabsKey: env("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: env("ELEVENLABS_VOICE_ID"),
  elevenLabsModelId: env("ELEVENLABS_MODEL_ID") ?? "eleven_multilingual_v2",
} as const;

export function getIntegrationStatus(): IntegrationStatus {
  const transcriptionConfigured =
    config.transcriptionProvider === "deepgram"
      ? bool(config.deepgramKey)
      : bool(config.transcriptionApiKey) &&
        bool(config.transcriptionApiUrl);

  return {
    database: {
      configured: bool(config.mongoUri),
      detail: bool(config.mongoUri)
        ? `MongoDB database “${config.mongoDbName}” is configured.`
        : "Set MONGODB_URI to enable persistence.",
    },
    transcription: {
      configured: transcriptionConfigured,
      detail:
        config.transcriptionProvider === "deepgram"
          ? transcriptionConfigured
            ? `Deepgram ${config.deepgramModel} with speaker diarization.`
            : "Set DEEPGRAM_API_KEY (or TRANSCRIPTION_API_KEY)."
          : transcriptionConfigured
            ? `Whisper-compatible endpoint (${config.transcriptionModel}).`
            : "Set TRANSCRIPTION_API_KEY and TRANSCRIPTION_API_URL.",
    },
    gemma: {
      configured: bool(config.gemmaUrl),
      detail: bool(config.gemmaUrl)
        ? `Gemma endpoint configured (${config.gemmaModel}).`
        : "Set GEMMA_API_URL to an OpenAI-compatible Gemma endpoint.",
    },
    elevenlabs: {
      configured: bool(config.elevenLabsKey) && bool(config.elevenLabsVoiceId),
      detail:
        bool(config.elevenLabsKey) && bool(config.elevenLabsVoiceId)
          ? "ElevenLabs text-to-speech is configured."
          : "Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.",
    },
    auth: {
      configured: bool(process.env.SESSION_SECRET),
      detail: bool(process.env.SESSION_SECRET)
        ? "Signed browser ownership sessions are enabled."
        : "SESSION_SECRET is using the development fallback. Set a strong secret in production.",
    },
  };
}

export function isDatabaseConfigured(): boolean {
  return bool(config.mongoUri);
}

export class ConfigurationError extends Error {
  code = "NOT_CONFIGURED";
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function requireIntegration(
  name: "gemma" | "elevenlabs" | "transcription" | "database",
): void {
  const status = getIntegrationStatus()[name];
  if (!status.configured) {
    throw new ConfigurationError(
      `${name === "gemma" ? "Gemma" : name === "elevenlabs" ? "ElevenLabs" : name === "transcription" ? "Transcription" : "MongoDB"} is not configured. ${status.detail}`,
    );
  }
}
