import type {
  ActionItem,
  ActionPriority,
  DecisionStatus,
  EvidenceRef,
  MeetingReport,
  SpeakerSuggestion,
  TranscriptSegment,
} from "@/types";
import type { AiReport } from "@/lib/validation/schemas";
import { formatTimestamp } from "@/lib/utils";

export interface GeneratedReportSections {
  executiveSummary: MeetingReport["executiveSummary"];
  discussionPoints: MeetingReport["discussionPoints"];
  speakerSuggestions: MeetingReport["speakerSuggestions"];
  speakerContributions: MeetingReport["speakerContributions"];
  decisions: MeetingReport["decisions"];
  openQuestions: MeetingReport["openQuestions"];
  nextMeeting: MeetingReport["nextMeeting"];
  validationWarnings: string[];
}

export interface GeneratedActionItem {
  task: string;
  owner: string;
  deadline: string;
  priority: ActionPriority;
  status: ActionItem["status"];
  evidenceTimestamp: number | null;
  evidenceText: string | null;
  sourceSegmentId: string | null;
}

export interface ReconciledReport {
  report: GeneratedReportSections;
  actionItems: GeneratedActionItem[];
}

const UNASSIGNED = "Unassigned";
const NOT_SPECIFIED = "Not specified";

function normalizeMissing(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^(n\/?a|none|unknown|not (specified|stated|mentioned|assigned)|tbd)$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

function reconcileEvidence(
  evidence: Array<{ segmentId: string; timestampSeconds: number | null; quote: string }>,
  segments: TranscriptSegment[],
  byId: Map<string, TranscriptSegment>,
  warnings: string[],
  claimLabel: string,
): EvidenceRef[] {
  const results: EvidenceRef[] = [];
  const seen = new Set<string>();

  for (const reference of evidence) {
    let segment = byId.get(reference.segmentId);
    if (!segment && reference.quote.trim().length > 12) {
      const needle = reference.quote.trim().toLowerCase().slice(0, 80);
      segment = segments.find((candidate) =>
        candidate.text.toLowerCase().includes(needle),
      );
    }
    if (!segment) {
      warnings.push(`${claimLabel}: a cited transcript segment could not be verified and was removed.`);
      continue;
    }
    if (seen.has(segment.id)) continue;
    seen.add(segment.id);
    const quote = reference.quote.trim();
    const quoteIsExact =
      quote.length > 0 && segment.text.toLowerCase().includes(quote.toLowerCase());
    results.push({
      segmentId: segment.id,
      timestampSeconds: segment.startSeconds,
      quote: quoteIsExact
        ? quote
        : segment.text.length > 280
          ? `${segment.text.slice(0, 277)}…`
          : segment.text,
    });
  }

  return results.slice(0, 8);
}

function verifyMention(value: string, fullText: string): boolean {
  const needle = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (!needle) return false;
  return fullText.includes(needle);
}

function supportsDate(value: string, fullText: string): boolean {
  const tokens = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  if (!tokens.length) return false;
  return tokens.some((token) => fullText.includes(token));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlaceholderName(value: string): boolean {
  return /^(person|speaker|participant|unknown|unassigned|host|moderator)\s*\d*$/i.test(
    value.trim(),
  );
}

function isSelfIntroduction(name: string, text: string): boolean {
  const escaped = escapeRegExp(name);
  // Require a real boundary after the name so "Maya's idea" is not treated as
  // "I'm Maya". "This is ..." only counts when used as an introduction.
  const boundary = "(?=[,.!?;:]|\\s|$)";
  return [
    `\\b(?:i[\u2019']?m|i am|my name is|call me|you can call me|i go by)\\s+${escaped}${boundary}`,
    `\\bthis is\\s+${escaped}(?=\\s+(?:speaking|here)\\b|[,.!?;:]|$)`,
    `\\b${escaped}\\s+here\\b`,
  ].some((pattern) => new RegExp(pattern, "i").test(text));
}

function reconcileSpeakerSuggestions(
  candidates: AiReport["speakerSuggestions"],
  segments: TranscriptSegment[],
  speakerIds: Set<string>,
  speakerLabels: Map<string, string>,
  warnings: string[],
): SpeakerSuggestion[] {
  const speakerText = new Map<string, string[]>();
  for (const segment of segments) {
    const texts = speakerText.get(segment.speakerId) ?? [];
    texts.push(segment.text);
    speakerText.set(segment.speakerId, texts);
  }

  const usedNames = new Set<string>();
  const suggestions: SpeakerSuggestion[] = [];

  for (const candidate of candidates ?? []) {
    const speakerId = candidate.speakerId.trim();
    const name = candidate.suggestedName.trim();
    if (!name || isPlaceholderName(name)) continue;

    if (!speakerIds.has(speakerId)) {
      warnings.push(
        `A suggested speaker name (“${name}”) referenced an unknown speaker and was not used.`,
      );
      continue;
    }

    const ownTexts = speakerText.get(speakerId) ?? [];
    const selfIdentified = ownTexts.some(
      (text) =>
        text.toLowerCase().includes(name.toLowerCase()) &&
        isSelfIntroduction(name, text),
    );
    if (!selfIdentified) {
      warnings.push(
        `Suggested name “${name}” was not explicitly self-identified by ${speakerLabels.get(speakerId) ?? speakerId} and was not used.`,
      );
      continue;
    }

    const key = name.toLowerCase();
    if (usedNames.has(key)) {
      warnings.push(
        `Suggested name “${name}” was assigned to more than one speaker and was only kept once.`,
      );
      continue;
    }

    suggestions.push({
      speakerId,
      suggestedName: name,
      confidence: "stated",
    });
    usedNames.add(key);
  }

  return suggestions;
}

export function reconcileReport(
  raw: AiReport,
  segments: TranscriptSegment[],
): ReconciledReport {
  const warnings: string[] = [];
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  const fullText = segments.map((segment) => segment.text).join(" ").toLowerCase();
  const speakerIds = new Set(segments.map((segment) => segment.speakerId));
  const speakerLabels = new Map(
    segments.map((segment) => [segment.speakerId, segment.speakerLabel]),
  );
  const speakerSuggestions = reconcileSpeakerSuggestions(
    raw.speakerSuggestions,
    segments,
    speakerIds,
    speakerLabels,
    warnings,
  );
  const knownSpeakerNames = new Set<string>();
  for (const label of speakerLabels.values()) {
    knownSpeakerNames.add(label.toLowerCase());
  }
  for (const suggestion of speakerSuggestions) {
    if (suggestion.suggestedName) {
      knownSpeakerNames.add(suggestion.suggestedName.toLowerCase());
    }
  }

  const discussionPoints = raw.discussionPoints.map((point, index) => ({
    topic: point.topic || `Discussion ${index + 1}`,
    summary: point.summary,
    proposals: point.proposals,
    concerns: point.concerns,
    evidence: reconcileEvidence(
      point.evidence,
      segments,
      byId,
      warnings,
      `Discussion “${point.topic || index + 1}”`,
    ),
  }));

  const speakerContributions = raw.speakerContributions
    .filter((contribution) => {
      if (speakerIds.has(contribution.speakerId)) return true;
      const matched = segments.find(
        (segment) =>
          segment.speakerLabel.toLowerCase() ===
          contribution.speakerName.toLowerCase(),
      );
      if (matched) {
        contribution.speakerId = matched.speakerId;
        return true;
      }
      warnings.push(
        `A speaker contribution for “${contribution.speakerName || "unknown speaker"}” could not be matched to a transcript speaker and was removed.`,
      );
      return false;
    })
    .map((contribution) => ({
      speakerId: contribution.speakerId,
      speakerName:
        speakerLabels.get(contribution.speakerId) ??
        contribution.speakerName ??
        "Speaker",
      points: contribution.points,
      evidence: reconcileEvidence(
        contribution.evidence,
        segments,
        byId,
        warnings,
        `Contribution from ${contribution.speakerName || contribution.speakerId}`,
      ),
    }));

  const decisions = raw.decisions
    .filter((decision) => decision.description.trim().length > 0)
    .map((decision) => {
      const evidence = reconcileEvidence(
        decision.evidence,
        segments,
        byId,
        warnings,
        "Decision",
      );
      if (evidence.length === 0) {
        warnings.push(
          "A decision had no verifiable transcript evidence. Review it before relying on it.",
        );
      }
      return {
        description: decision.description,
        status: (decision.status === "confirmed"
          ? "confirmed"
          : "tentative") as DecisionStatus,
        evidence,
      };
    });

  const actionItems: GeneratedActionItem[] = raw.actionItems
    .filter((item) => item.task.trim().length > 0)
    .map((item) => {
      const evidence = reconcileEvidence(
        item.evidence,
        segments,
        byId,
        warnings,
        `Action “${item.task.slice(0, 60)}”`,
      );
      let owner = normalizeMissing(item.owner, UNASSIGNED);
      if (
        owner !== UNASSIGNED &&
        !verifyMention(owner, fullText) &&
        !knownSpeakerNames.has(owner.toLowerCase())
      ) {
        warnings.push(
          `Owner “${owner}” was not explicitly found in the transcript and was changed to Unassigned.`,
        );
        owner = UNASSIGNED;
      }
      let deadline = normalizeMissing(item.deadline, NOT_SPECIFIED);
      if (deadline !== NOT_SPECIFIED && !supportsDate(deadline, fullText)) {
        warnings.push(
          `Deadline “${deadline}” was not supported by the transcript and was changed to Not specified.`,
        );
        deadline = NOT_SPECIFIED;
      }
      const primary = evidence[0];
      return {
        task: item.task,
        owner,
        deadline,
        priority: item.priority,
        status: "pending" as const,
        evidenceTimestamp: primary?.timestampSeconds ?? null,
        evidenceText: primary?.quote ?? null,
        sourceSegmentId: primary?.segmentId ?? null,
      };
    });

  const openQuestions = raw.openQuestions
    .filter((question) => question.question.trim().length > 0)
    .map((question) => ({
      question: question.question,
      context: question.context,
      evidence: reconcileEvidence(
        question.evidence,
        segments,
        byId,
        warnings,
        "Open question",
      ),
    }));

  let proposedDate = raw.nextMeeting.proposedDate?.trim() || null;
  if (proposedDate && !supportsDate(proposedDate, fullText)) {
    warnings.push(
      `The proposed next-meeting date “${proposedDate}” was not supported by the transcript and was removed.`,
    );
    proposedDate = null;
  }

  const report: GeneratedReportSections = {
    executiveSummary: {
      purpose: raw.executiveSummary.purpose,
      keyOutcomes: raw.executiveSummary.keyOutcomes,
      takeaways: raw.executiveSummary.takeaways,
    },
    discussionPoints,
    speakerSuggestions,
    speakerContributions,
    decisions,
    openQuestions,
    nextMeeting: {
      proposedDate,
      agenda: raw.nextMeeting.agenda,
    },
    validationWarnings: [...new Set(warnings)],
  };

  return { report, actionItems };
}

export function buildReportMarkdown(input: {
  title: string;
  createdAt: string;
  speakers: string[];
  language: string;
  report: MeetingReport | GeneratedReportSections;
  actionItems: ActionItem[] | GeneratedActionItem[];
  recapScript?: string | null;
}): string {
  const { report } = input;
  const lines: string[] = [];
  lines.push(`# ${input.title}`);
  lines.push("");
  lines.push(`*${new Date(input.createdAt).toUTCString()} · ${input.language.toUpperCase()}*`);
  if (input.speakers.length) {
    lines.push(`**Speakers:** ${input.speakers.join(", ")}`);
  }
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push(`**Purpose:** ${report.executiveSummary.purpose || "—"}`);
  lines.push("");
  if (report.executiveSummary.keyOutcomes.length) {
    lines.push("**Key outcomes**");
    for (const outcome of report.executiveSummary.keyOutcomes) lines.push(`- ${outcome}`);
    lines.push("");
  }
  if (report.executiveSummary.takeaways.length) {
    lines.push("**Key takeaways**");
    for (const takeaway of report.executiveSummary.takeaways) lines.push(`- ${takeaway}`);
    lines.push("");
  }

  if (report.discussionPoints.length) {
    lines.push("## Discussion points");
    for (const point of report.discussionPoints) {
      lines.push("");
      lines.push(`### ${point.topic}`);
      lines.push(point.summary);
      for (const proposal of point.proposals) lines.push(`- Proposal: ${proposal}`);
      for (const concern of point.concerns) lines.push(`- Concern: ${concern}`);
      if (point.evidence.length) {
        lines.push(
          `_Evidence: ${point.evidence
            .map((evidence) => `[${formatTimestamp(evidence.timestampSeconds)}] “${evidence.quote}”`)
            .join(" · ")}_`,
        );
      }
    }
    lines.push("");
  }

  if (report.decisions.length) {
    lines.push("## Decisions");
    for (const decision of report.decisions) {
      lines.push(
        `- **${decision.status === "confirmed" ? "Confirmed" : "Tentative"}:** ${decision.description}`,
      );
      for (const evidence of decision.evidence) {
        lines.push(`  - Evidence [${formatTimestamp(evidence.timestampSeconds)}]: “${evidence.quote}”`);
      }
    }
    lines.push("");
  }

  lines.push("## Action items");
  if (input.actionItems.length === 0) {
    lines.push("_No action items were identified._");
  } else {
    lines.push("| Task | Owner | Deadline | Priority | Status |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of input.actionItems) {
      lines.push(
        `| ${item.task.replace(/\|/g, "\\|")} | ${item.owner} | ${item.deadline} | ${item.priority} | ${item.status.replace("_", " ")} |`,
      );
    }
  }
  lines.push("");

  if (report.openQuestions.length) {
    lines.push("## Open questions");
    for (const question of report.openQuestions) {
      lines.push(`- ${question.question}`);
      if (question.context) lines.push(`  - Context: ${question.context}`);
    }
    lines.push("");
  }

  const nextMeeting = report.nextMeeting;
  if (nextMeeting.proposedDate || nextMeeting.agenda.length) {
    lines.push("## Next meeting");
    if (nextMeeting.proposedDate) lines.push(`**Proposed date:** ${nextMeeting.proposedDate}`);
    for (const agenda of nextMeeting.agenda) lines.push(`- ${agenda}`);
    lines.push("");
  }

  if (report.speakerContributions.length) {
    lines.push("## Speaker contributions");
    for (const contribution of report.speakerContributions) {
      lines.push(`- **${contribution.speakerName}**: ${contribution.points.join("; ")}`);
    }
    lines.push("");
  }

  if (input.recapScript) {
    lines.push("## Audio recap script");
    lines.push(input.recapScript);
    lines.push("");
  }

  if (report.validationWarnings?.length) {
    lines.push("## Validation notes");
    for (const warning of report.validationWarnings) lines.push(`- ${warning}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "_Generated with MeetBrief AI. AI output can contain mistakes. Verify decisions and assignments against the transcript._",
  );
  return lines.join("\n");
}
