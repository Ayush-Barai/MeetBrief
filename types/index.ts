export type MeetingStatus = "uploaded" | "processing" | "completed" | "failed";

export type ProcessingStage =
  | "queued"
  | "transcribing"
  | "analyzing"
  | "saving"
  | "generating_recap"
  | "done"
  | "failed";

export type ActionStatus = "pending" | "in_progress" | "completed";
export type ActionPriority = "high" | "medium" | "low" | "unspecified";
export type DecisionStatus = "confirmed" | "tentative";

export interface EvidenceRef {
  segmentId: string;
  timestampSeconds: number;
  quote: string;
}

export interface ExecutiveSummary {
  purpose: string;
  keyOutcomes: string[];
  takeaways: string[];
}

export interface DiscussionPoint {
  topic: string;
  summary: string;
  proposals: string[];
  concerns: string[];
  evidence: EvidenceRef[];
}

export interface SpeakerContribution {
  speakerId: string;
  speakerName: string;
  points: string[];
  evidence: EvidenceRef[];
}

export type SpeakerSuggestionConfidence = "stated" | "contextual";

export interface SpeakerSuggestion {
  speakerId: string;
  suggestedName: string | null;
  confidence: SpeakerSuggestionConfidence | null;
}

export interface SpeakerSummary {
  speakerId: string;
  label: string;
  segmentCount: number;
  firstSeenSeconds: number;
  suggestedName: string | null;
  suggestionConfidence: SpeakerSuggestionConfidence | null;
  named: boolean;
}

export interface Decision {
  description: string;
  status: DecisionStatus;
  evidence: EvidenceRef[];
}

export interface OpenQuestion {
  question: string;
  context: string;
  evidence: EvidenceRef[];
}

export interface NextMeeting {
  proposedDate: string | null;
  agenda: string[];
}

export interface MeetingReport {
  executiveSummary: ExecutiveSummary;
  discussionPoints: DiscussionPoint[];
  speakerSuggestions: SpeakerSuggestion[];
  speakerContributions: SpeakerContribution[];
  decisions: Decision[];
  openQuestions: OpenQuestion[];
  nextMeeting: NextMeeting;
  version: number;
  generatedAt: string;
  editedAt: string | null;
  validationWarnings: string[];
  model: string | null;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  task: string;
  owner: string;
  deadline: string;
  priority: ActionPriority;
  status: ActionStatus;
  evidenceTimestamp: number | null;
  evidenceText: string | null;
  sourceSegmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  position: number;
  startSeconds: number;
  endSeconds: number;
  speakerId: string;
  speakerLabel: string;
  text: string;
  confidence: number | null;
}

export interface TranscriptMeta {
  provider: string;
  model: string;
  language: string;
  generatedAt: string;
  diarized: boolean;
}

export interface AudioRef {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RecapMeta {
  status: "none" | "generating" | "ready" | "failed" | "stale";
  script: string | null;
  generatedAt: string | null;
  voiceId: string | null;
  mimeType: string | null;
  error: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  language: string;
  status: MeetingStatus;
  processingStage: ProcessingStage;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  audio: AudioRef | null;
  transcriptMeta: TranscriptMeta | null;
  recap: RecapMeta;
  shareEnabled: boolean;
  isDemo?: boolean;
}

export interface MeetingDetail extends Meeting {
  report: MeetingReport | null;
  actionItems: ActionItem[];
  transcript: TranscriptSegment[];
}

export interface MeetingStats {
  total: number;
  completed: number;
  processing: number;
  pendingActions: number;
  totalMinutes: number;
}

export interface IntegrationState {
  configured: boolean;
  detail: string;
}

export interface IntegrationStatus {
  database: IntegrationState;
  transcription: IntegrationState;
  gemma: IntegrationState;
  elevenlabs: IntegrationState;
  auth: IntegrationState;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "multi", label: "Multilingual" },
] as const;
