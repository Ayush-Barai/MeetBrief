import "server-only";

import { requireIntegration } from "@/lib/config";
import { createWhisperAdapter } from "./whisper";
import type { TranscriptionAdapter } from "./types";

export type { TranscriptionAdapter, TranscriptionResult } from "./types";

/**
 * MeetBrief uses an OpenAI-compatible Whisper endpoint so the transcription
 * model can be self-hosted with open-source software (faster-whisper,
 * ScribeCrate, whisper.cpp, vLLM, and similar servers).
 */
export function getTranscriptionAdapter(): TranscriptionAdapter {
  requireIntegration("transcription");
  return createWhisperAdapter();
}
