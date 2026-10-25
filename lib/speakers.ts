import type {
  MeetingReport,
  SpeakerSuggestion,
  SpeakerSummary,
  TranscriptSegment,
} from "@/types";

export function defaultSpeakerLabel(index: number): string {
  return `Person ${index + 1}`;
}

export function isAnonymousSpeakerLabel(label: string): boolean {
  return /^(person|speaker|participant)\s+\d+$/i.test(label.trim());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces a whole-word speaker reference in report prose.
 * Evidence quotes are never passed through this helper.
 */
export function replaceSpeakerName(
  text: string,
  from: string,
  to: string,
): string {
  const source = from.trim();
  const target = to.trim();
  if (
    !text ||
    !source ||
    !target ||
    source.toLowerCase() === target.toLowerCase()
  ) {
    return text;
  }
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(${escapeRegExp(source)})(?=$|[^\\p{L}\\p{N}_])`,
    "giu",
  );
  return text.replace(
    pattern,
    (_match, prefix: string) => `${prefix}${target}`,
  );
}

export function deriveSpeakers(
  segments: TranscriptSegment[],
  suggestions: SpeakerSuggestion[] = [],
): SpeakerSummary[] {
  const suggestionById = new Map(
    suggestions
      .filter((suggestion) => Boolean(suggestion.speakerId))
      .map((suggestion) => [suggestion.speakerId, suggestion]),
  );
  const speakers = new Map<string, SpeakerSummary>();
  const ordered = [...segments].sort((a, b) => a.position - b.position);

  for (const segment of ordered) {
    const existing = speakers.get(segment.speakerId);
    if (existing) {
      existing.segmentCount += 1;
      continue;
    }
    const suggestion = suggestionById.get(segment.speakerId);
    const label =
      segment.speakerLabel.trim() || defaultSpeakerLabel(speakers.size);
    speakers.set(segment.speakerId, {
      speakerId: segment.speakerId,
      label,
      segmentCount: 1,
      firstSeenSeconds: segment.startSeconds,
      suggestedName: suggestion?.suggestedName ?? null,
      suggestionConfidence: suggestion?.confidence ?? null,
      named: !isAnonymousSpeakerLabel(label),
    });
  }

  return Array.from(speakers.values());
}

export function speakerLabelsFor(
  segments: TranscriptSegment[],
  suggestions: SpeakerSuggestion[] = [],
): string[] {
  return deriveSpeakers(segments, suggestions).map((speaker) => speaker.label);
}

function renameAll(text: string, aliases: string[], name: string): string {
  return aliases.reduce(
    (value, alias) => replaceSpeakerName(value, alias, name),
    text,
  );
}

export interface SpeakerRename {
  speakerId: string;
  aliases: string[];
  name: string;
}

/**
 * Renames a speaker in every structured report field while leaving evidence
 * quotes byte-for-byte intact.
 */
export function renameSpeakerInReport(
  report: MeetingReport,
  rename: SpeakerRename,
): MeetingReport {
  const { speakerId, aliases, name } = rename;
  const apply = (value: string) => renameAll(value, aliases, name);

  return {
    ...report,
    executiveSummary: {
      purpose: apply(report.executiveSummary.purpose),
      keyOutcomes: report.executiveSummary.keyOutcomes.map(apply),
      takeaways: report.executiveSummary.takeaways.map(apply),
    },
    discussionPoints: report.discussionPoints.map((point) => ({
      ...point,
      topic: apply(point.topic),
      summary: apply(point.summary),
      proposals: point.proposals.map(apply),
      concerns: point.concerns.map(apply),
      evidence: point.evidence,
    })),
    speakerSuggestions: (report.speakerSuggestions ?? []).map((suggestion) =>
      suggestion.speakerId === speakerId
        ? { ...suggestion, suggestedName: null, confidence: null }
        : suggestion,
    ),
    speakerContributions: report.speakerContributions.map((contribution) => ({
      ...contribution,
      speakerName:
        contribution.speakerId === speakerId
          ? name
          : apply(contribution.speakerName),
      points: contribution.points.map(apply),
      evidence: contribution.evidence,
    })),
    decisions: report.decisions.map((decision) => ({
      ...decision,
      description: apply(decision.description),
      evidence: decision.evidence,
    })),
    openQuestions: report.openQuestions.map((question) => ({
      ...question,
      question: apply(question.question),
      context: apply(question.context),
      evidence: question.evidence,
    })),
    nextMeeting: {
      ...report.nextMeeting,
      agenda: report.nextMeeting.agenda.map(apply),
    },
    validationWarnings: report.validationWarnings.map(apply),
  };
}

export function renameSpeakerInActionItem<
  T extends { task: string; owner: string },
>(item: T, aliases: string[], name: string): T {
  const ownerMatches = aliases.some(
    (alias) => alias.trim().toLowerCase() === item.owner.trim().toLowerCase(),
  );
  return {
    ...item,
    task: renameAll(item.task, aliases, name),
    owner: ownerMatches ? name : renameAll(item.owner, aliases, name),
  };
}
