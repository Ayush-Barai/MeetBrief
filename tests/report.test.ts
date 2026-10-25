import { describe, expect, it } from "vitest";
import { reconcileReport, buildReportMarkdown } from "@/lib/ai/report";
import type { AiReport } from "@/lib/validation/schemas";
import type { MeetingReport, TranscriptSegment } from "@/types";

const segments: TranscriptSegment[] = [
  {
    id: "s1",
    meetingId: "m1",
    position: 0,
    startSeconds: 12,
    endSeconds: 20,
    speakerId: "speaker-1",
    speakerLabel: "Speaker 1",
    text: "Sarah will send the launch copy to legal by Friday.",
    confidence: 0.9,
  },
  {
    id: "s2",
    meetingId: "m1",
    position: 1,
    startSeconds: 35,
    endSeconds: 42,
    speakerId: "speaker-2",
    speakerLabel: "Speaker 2",
    text: "We agreed to keep the September 30 launch date.",
    confidence: 0.88,
  },
  {
    id: "s3",
    meetingId: "m1",
    position: 2,
    startSeconds: 51,
    endSeconds: 60,
    speakerId: "speaker-1",
    speakerLabel: "Speaker 1",
    text: "Legal still has to review the trial terms.",
    confidence: 0.91,
  },
];

const validAiReport: AiReport = {
  executiveSummary: {
    purpose: "Confirm launch readiness.",
    keyOutcomes: ["Launch date stays September 30."],
    takeaways: ["Legal review is the remaining risk."],
  },
  discussionPoints: [
    {
      topic: "Launch",
      summary: "The team confirmed the date.",
      proposals: [],
      concerns: ["Legal review"],
      evidence: [
        { segmentId: "s2", timestampSeconds: 999, quote: "We agreed to keep the September 30 launch date." },
      ],
    },
  ],
  speakerContributions: [
    {
      speakerId: "speaker-1",
      speakerName: "Speaker 1",
      points: ["Raised the legal review."],
      evidence: [{ segmentId: "s3", timestampSeconds: 0, quote: "Legal still has to review the trial terms." }],
    },
  ],
  decisions: [
    {
      description: "Keep the September 30 launch date.",
      status: "confirmed",
      evidence: [{ segmentId: "s2", timestampSeconds: 0, quote: "" }],
    },
  ],
  actionItems: [
    {
      task: "Send the launch copy to legal.",
      owner: "Sarah",
      deadline: "Friday",
      priority: "high",
      evidence: [{ segmentId: "s1", timestampSeconds: 0, quote: "" }],
    },
    {
      task: "Book the launch room.",
      owner: "Maya",
      deadline: "October 15",
      priority: "medium",
      evidence: [{ segmentId: "s3", timestampSeconds: 0, quote: "" }],
    },
  ],
  openQuestions: [
    {
      question: "When will legal approve?",
      context: "No date given.",
      evidence: [{ segmentId: "s3", timestampSeconds: 0, quote: "" }],
    },
  ],
  nextMeeting: { proposedDate: "October 2", agenda: ["Legal update"] },
};

describe("reconcileReport", () => {
  it("rewrites evidence timestamps from the transcript", () => {
    const result = reconcileReport(validAiReport, segments);
    expect(result.report.discussionPoints[0].evidence[0].timestampSeconds).toBe(35);
    expect(result.report.decisions[0].evidence[0].quote).toContain("September 30");
  });

  it("removes owners and deadlines that are not in the transcript", () => {
    const result = reconcileReport(validAiReport, segments);
    const sarah = result.actionItems[0];
    const maya = result.actionItems[1];
    expect(sarah.owner).toBe("Sarah");
    expect(sarah.deadline).toBe("Friday");
    expect(maya.owner).toBe("Unassigned");
    expect(maya.deadline).toBe("Not specified");
    expect(result.report.validationWarnings.some((warning) => warning.includes("Maya"))).toBe(true);
  });

  it("drops invalid evidence references", () => {
    const input: AiReport = {
      ...validAiReport,
      decisions: [
        {
          description: "Unsupported decision.",
          status: "confirmed",
          evidence: [{ segmentId: "missing", timestampSeconds: 3, quote: "This quote does not exist anywhere in the transcript at all." }],
        },
      ],
    };
    const result = reconcileReport(input, segments);
    expect(result.report.decisions[0].evidence).toHaveLength(0);
    expect(result.report.validationWarnings.some((warning) => warning.includes("could not be verified"))).toBe(true);
  });

  it("removes unsupported next-meeting dates", () => {
    const result = reconcileReport(validAiReport, segments);
    expect(result.report.nextMeeting.proposedDate).toBeNull();
  });

  it("matches speaker contributions by label when the ID is unknown", () => {
    const input: AiReport = {
      ...validAiReport,
      speakerContributions: [
        {
          speakerId: "unknown",
          speakerName: "Speaker 2",
          points: ["Supported the date."],
          evidence: [],
        },
      ],
    };
    const result = reconcileReport(input, segments);
    expect(result.report.speakerContributions[0].speakerId).toBe("speaker-2");
  });
});

describe("buildReportMarkdown", () => {
  it("includes decisions, action items, evidence, and the AI disclaimer", () => {
    const reconciled = reconcileReport(validAiReport, segments);
    const report: MeetingReport = {
      ...reconciled.report,
      version: 1,
      generatedAt: new Date("2026-01-01").toISOString(),
      editedAt: null,
      model: "gemma3:27b",
    };
    const markdown = buildReportMarkdown({
      title: "Launch meeting",
      createdAt: "2026-01-01T00:00:00.000Z",
      participants: ["Sarah"],
      language: "en",
      report,
      actionItems: [],
      recapScript: "A short recap.",
    });
    expect(markdown).toContain("# Launch meeting");
    expect(markdown).toContain("## Decisions");
    expect(markdown).toContain("Keep the September 30 launch date.");
    expect(markdown).toContain("## Audio recap script");
    expect(markdown).toContain("AI output can contain mistakes");
  });
});
