export interface RawTranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  speakerId: string;
  speakerLabel: string;
  text: string;
  confidence: number | null;
}

export interface TranscriptionResult {
  segments: RawTranscriptSegment[];
  provider: string;
  model: string;
  language: string;
  diarized: boolean;
}

export interface TranscriptionInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  language: string;
}

export interface TranscriptionAdapter {
  name: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
