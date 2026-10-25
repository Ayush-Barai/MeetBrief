import "server-only";

import { config, requireIntegration } from "@/lib/config";
import { createDeepgramAdapter } from "./deepgram";
import { createWhisperAdapter } from "./whisper";
import type { TranscriptionAdapter } from "./types";

export type { TranscriptionAdapter, TranscriptionResult } from "./types";

export function getTranscriptionAdapter(): TranscriptionAdapter {
  requireIntegration("transcription");
  if (config.transcriptionProvider === "whisper") {
    return createWhisperAdapter();
  }
  return createDeepgramAdapter();
}
