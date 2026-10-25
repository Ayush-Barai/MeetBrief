import { AppError } from "@/lib/errors";
import { config } from "@/lib/config";

const AUDIO_TYPES: Record<string, string[]> = {
  mp3: ["audio/mpeg", "audio/mp3", "audio/x-mpeg"],
  wav: ["audio/wav", "audio/x-wav", "audio/wave"],
  m4a: ["audio/mp4", "audio/x-m4a", "audio/m4a"],
  mp4: ["audio/mp4", "video/mp4"],
  webm: ["audio/webm", "video/webm"],
  ogg: ["audio/ogg", "application/ogg"],
  oga: ["audio/ogg", "application/ogg"],
  aac: ["audio/aac", "audio/x-aac"],
  flac: ["audio/flac", "audio/x-flac"],
  mpga: ["audio/mpeg"],
};

export function normalizeAudioFile(input: {
  name: string;
  type: string;
  size: number;
}): { extension: string; mimeType: string } {
  const extension = input.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = AUDIO_TYPES[extension];
  if (!allowed) {
    throw new AppError(
      "Unsupported audio format. Use MP3, WAV, M4A, WebM, OGG, AAC, FLAC, or MP4.",
      { status: 415, code: "UNSUPPORTED_AUDIO" },
    );
  }
  const provided = input.type?.toLowerCase() || "";
  const mimeType =
    provided && (provided.startsWith("audio/") || provided === "video/mp4" || provided === "video/webm")
      ? provided
      : allowed[0];
  return { extension, mimeType };
}

export function validateAudioUpload(file: File): {
  extension: string;
  mimeType: string;
  filename: string;
} {
  if (!file || file.size === 0) {
    throw new AppError("Choose an audio file to upload.", {
      status: 400,
      code: "EMPTY_FILE",
    });
  }
  if (file.size > config.maxUploadBytes) {
    throw new AppError(
      `This file is larger than the ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB limit.`,
      { status: 413, code: "FILE_TOO_LARGE" },
    );
  }
  const { extension, mimeType } = normalizeAudioFile({
    name: file.name || "recording.webm",
    type: file.type,
    size: file.size,
  });
  const base = (file.name || "recording")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  return {
    extension,
    mimeType,
    filename: `${base || "recording"}.${extension}`,
  };
}

export const ACCEPTED_AUDIO =
  ".mp3,.wav,.m4a,.webm,.ogg,.oga,.aac,.flac,.mp4,audio/*";
