import type { MeetingDetail } from "@/types";

export const DEMO_MEETING: MeetingDetail = {
  id: "demo-meeting",
  title: "Q3 Launch Readiness",
  participantNames: ["Maya Chen", "Daniel Okafor", "Priya Raman", "Leo Fischer"],
  language: "en",
  status: "completed",
  processingStage: "done",
  durationSeconds: 2_460,
  createdAt: "2026-09-18T15:00:00.000Z",
  updatedAt: "2026-09-18T15:06:00.000Z",
  errorMessage: null,
  audio: {
    filename: "q3-launch-readiness-demo.webm",
    mimeType: "audio/webm",
    sizeBytes: 18_400_000,
  },
  transcriptMeta: {
    provider: "deepgram (demo)",
    model: "nova-3",
    language: "en",
    generatedAt: "2026-09-18T15:02:00.000Z",
    diarized: true,
  },
  recap: {
    status: "none",
    script: null,
    generatedAt: null,
    voiceId: null,
    mimeType: null,
    error: null,
  },
  shareEnabled: false,
  isDemo: true,
  report: {
    version: 1,
    generatedAt: "2026-09-18T15:05:00.000Z",
    editedAt: null,
    model: "gemma3:27b (demo)",
    validationWarnings: [
      "Demo report. In the app, model claims are checked against transcript segment IDs and unsupported owners or deadlines are removed.",
    ],
    executiveSummary: {
      purpose:
        "Confirm launch readiness for the September 30 release and resolve the remaining open decisions around pricing, onboarding, and support coverage.",
      keyOutcomes: [
        "Launch remains on track for September 30.",
        "Free trial will run for 14 days, down from 30.",
        "Onboarding email sequence moves to the week of launch, not before.",
        "Support will add one temporary weekend shift during launch week.",
      ],
      takeaways: [
        "Pricing change needs a final legal review before the announcement.",
        "The team accepted a smaller first-week marketing push to protect quality.",
        "A launch-day war room will run from 9:00 to 15:00 CET.",
      ],
    },
    discussionPoints: [
      {
        topic: "Launch date and scope",
        summary:
          "The team reviewed the remaining engineering work and agreed the current scope is achievable. Two non-critical integrations move to the next release.",
        proposals: [
          "Keep analytics export in the launch scope.",
          "Move the Salesforce sync to the following release.",
        ],
        concerns: [
          "QA has not yet tested the pricing page on mobile Safari.",
        ],
        evidence: [
          {
            segmentId: "demo-s1",
            timestampSeconds: 84,
            quote:
              "I think we keep the export work in scope and move Salesforce to the next release.",
          },
          {
            segmentId: "demo-s2",
            timestampSeconds: 149,
            quote: "September 30 is still realistic if we freeze scope today.",
          },
        ],
      },
      {
        topic: "Trial length and pricing communication",
        summary:
          "A shorter trial was proposed to improve conversion and reduce support load. The group agreed in principle, pending legal review of the announcement language.",
        proposals: [
          "Offer 14-day trial instead of 30 days.",
          "Announce the change with a clear comparison table.",
        ],
        concerns: [
          "Legal needs to confirm the refund language.",
          "Existing trial users may expect the previous terms.",
        ],
        evidence: [
          {
            segmentId: "demo-s3",
            timestampSeconds: 386,
            quote:
              "We can move to fourteen days, but I don't want to announce it until legal signs off.",
          },
          {
            segmentId: "demo-s4",
            timestampSeconds: 432,
            quote: "Let's keep existing trials on the 30-day terms.",
          },
        ],
      },
      {
        topic: "Launch-week support plan",
        summary:
          "Support capacity was the main operational risk. The team agreed to add a temporary weekend shift and run a daily triage at 9:00 CET.",
        proposals: [
          "Add one temporary weekend support shift.",
          "Run a 15-minute launch triage each morning.",
        ],
        concerns: [
          "The weekend shift depends on a contractor being available.",
        ],
        evidence: [
          {
            segmentId: "demo-s5",
            timestampSeconds: 1_248,
            quote:
              "I'd rather add one weekend shift for launch week than under-cover the first weekend.",
          },
        ],
      },
    ],
    speakerContributions: [
      {
        speakerId: "speaker-1",
        speakerName: "Maya Chen",
        points: [
          "Kept the team focused on the September 30 date and scope freeze.",
          "Proposed moving the Salesforce sync out of launch scope.",
        ],
        evidence: [
          {
            segmentId: "demo-s1",
            timestampSeconds: 84,
            quote:
              "I think we keep the export work in scope and move Salesforce to the next release.",
          },
        ],
      },
      {
        speakerId: "speaker-2",
        speakerName: "Daniel Okafor",
        points: [
          "Raised trial-length conversion data.",
          "Suggested preserving 30-day terms for existing trials.",
        ],
        evidence: [
          {
            segmentId: "demo-s3",
            timestampSeconds: 386,
            quote:
              "We can move to fourteen days, but I don't want to announce it until legal signs off.",
          },
        ],
      },
      {
        speakerId: "speaker-3",
        speakerName: "Priya Raman",
        points: [
          "Flagged mobile Safari QA coverage as an open risk.",
          "Volunteered to run launch-week triage.",
        ],
        evidence: [
          {
            segmentId: "demo-s2",
            timestampSeconds: 149,
            quote: "September 30 is still realistic if we freeze scope today.",
          },
        ],
      },
      {
        speakerId: "speaker-4",
        speakerName: "Leo Fischer",
        points: [
          "Proposed the temporary weekend support shift.",
          "Estimated one contractor can cover the weekend queue.",
        ],
        evidence: [
          {
            segmentId: "demo-s5",
            timestampSeconds: 1_248,
            quote:
              "I'd rather add one weekend shift for launch week than under-cover the first weekend.",
          },
        ],
      },
    ],
    decisions: [
      {
        description:
          "Keep the September 30 launch date and freeze scope, moving the Salesforce sync to the next release.",
        status: "confirmed",
        evidence: [
          {
            segmentId: "demo-s2",
            timestampSeconds: 149,
            quote: "September 30 is still realistic if we freeze scope today.",
          },
        ],
      },
      {
        description:
          "Adopt a 14-day trial for new signups, subject to legal review of the announcement.",
        status: "tentative",
        evidence: [
          {
            segmentId: "demo-s3",
            timestampSeconds: 386,
            quote:
              "We can move to fourteen days, but I don't want to announce it until legal signs off.",
          },
        ],
      },
      {
        description:
          "Existing trial users will remain on the 30-day terms they signed up for.",
        status: "confirmed",
        evidence: [
          {
            segmentId: "demo-s4",
            timestampSeconds: 432,
            quote: "Let's keep existing trials on the 30-day terms.",
          },
        ],
      },
    ],
    openQuestions: [
      {
        question:
          "Will legal approve the trial change in time for the launch announcement?",
        context:
          "The team agreed not to publish the 14-day trial until legal signs off. No approval date was given.",
        evidence: [
          {
            segmentId: "demo-s3",
            timestampSeconds: 386,
            quote:
              "We can move to fourteen days, but I don't want to announce it until legal signs off.",
          },
        ],
      },
      {
        question: "Is a contractor available for the launch-weekend support shift?",
        context:
          "The support plan depends on temporary weekend coverage, but availability was not confirmed.",
        evidence: [],
      },
    ],
    nextMeeting: {
      proposedDate: null,
      agenda: [
        "Legal update on trial terms",
        "Final mobile Safari QA result",
        "Confirm weekend support coverage",
      ],
    },
  },
  actionItems: [
    {
      id: "demo-a1",
      meetingId: "demo-meeting",
      task: "Send the trial announcement copy to legal for review.",
      owner: "Daniel Okafor",
      deadline: "September 22",
      priority: "high",
      status: "in_progress",
      evidenceTimestamp: 386,
      evidenceText:
        "We can move to fourteen days, but I don't want to announce it until legal signs off.",
      sourceSegmentId: "demo-s3",
      createdAt: "2026-09-18T15:05:00.000Z",
      updatedAt: "2026-09-18T15:05:00.000Z",
    },
    {
      id: "demo-a2",
      meetingId: "demo-meeting",
      task: "Complete mobile Safari checkout QA and report any blockers.",
      owner: "Priya Raman",
      deadline: "September 24",
      priority: "high",
      status: "pending",
      evidenceTimestamp: 149,
      evidenceText: "September 30 is still realistic if we freeze scope today.",
      sourceSegmentId: "demo-s2",
      createdAt: "2026-09-18T15:05:00.000Z",
      updatedAt: "2026-09-18T15:05:00.000Z",
    },
    {
      id: "demo-a3",
      meetingId: "demo-meeting",
      task: "Confirm contractor availability for the weekend support shift.",
      owner: "Leo Fischer",
      deadline: "September 23",
      priority: "medium",
      status: "pending",
      evidenceTimestamp: 1_248,
      evidenceText:
        "I'd rather add one weekend shift for launch week than under-cover the first weekend.",
      sourceSegmentId: "demo-s5",
      createdAt: "2026-09-18T15:05:00.000Z",
      updatedAt: "2026-09-18T15:05:00.000Z",
    },
    {
      id: "demo-a4",
      meetingId: "demo-meeting",
      task: "Set up the daily 9:00 CET launch triage.",
      owner: "Maya Chen",
      deadline: "September 29",
      priority: "medium",
      status: "completed",
      evidenceTimestamp: 1_248,
      evidenceText:
        "I'd rather add one weekend shift for launch week than under-cover the first weekend.",
      sourceSegmentId: "demo-s5",
      createdAt: "2026-09-18T15:05:00.000Z",
      updatedAt: "2026-09-19T09:12:00.000Z",
    },
  ],
  transcript: [
    {
      id: "demo-s1",
      meetingId: "demo-meeting",
      position: 0,
      startSeconds: 84,
      endSeconds: 97,
      speakerId: "speaker-1",
      speakerLabel: "Maya Chen",
      text: "I think we keep the export work in scope and move Salesforce to the next release.",
      confidence: 0.96,
    },
    {
      id: "demo-s2",
      meetingId: "demo-meeting",
      position: 1,
      startSeconds: 149,
      endSeconds: 163,
      speakerId: "speaker-3",
      speakerLabel: "Priya Raman",
      text: "September 30 is still realistic if we freeze scope today.",
      confidence: 0.94,
    },
    {
      id: "demo-s3",
      meetingId: "demo-meeting",
      position: 2,
      startSeconds: 386,
      endSeconds: 405,
      speakerId: "speaker-2",
      speakerLabel: "Daniel Okafor",
      text: "We can move to fourteen days, but I don't want to announce it until legal signs off.",
      confidence: 0.92,
    },
    {
      id: "demo-s4",
      meetingId: "demo-meeting",
      position: 3,
      startSeconds: 432,
      endSeconds: 444,
      speakerId: "speaker-2",
      speakerLabel: "Daniel Okafor",
      text: "Let's keep existing trials on the 30-day terms.",
      confidence: 0.95,
    },
    {
      id: "demo-s5",
      meetingId: "demo-meeting",
      position: 4,
      startSeconds: 1_248,
      endSeconds: 1_267,
      speakerId: "speaker-4",
      speakerLabel: "Leo Fischer",
      text: "I'd rather add one weekend shift for launch week than under-cover the first weekend.",
      confidence: 0.93,
    },
    {
      id: "demo-s6",
      meetingId: "demo-meeting",
      position: 5,
      startSeconds: 1_402,
      endSeconds: 1_420,
      speakerId: "speaker-1",
      speakerLabel: "Maya Chen",
      text: "Good. I'll set up the daily triage and share the runbook before Friday.",
      confidence: 0.95,
    },
  ],
};

export const DEMO_NOTICE =
  "Demo data. This is a fictional meeting created to show the report format — no real people, recordings, or AI calls are involved.";
