import { z } from "zod";
import { LANGUAGES } from "@/types";

const languageValues = LANGUAGES.map((language) => language.value) as [
  string,
  ...string[],
];

const cleanString = (max = 2_000) =>
  z.string().trim().max(max).default("");

const shortList = z.array(z.string().trim().min(1).max(500)).max(24).default([]);

export const createMeetingSchema = z.object({
  title: z.string().trim().min(2, "Add a meeting title").max(160),
  participantNames: z
    .array(z.string().trim().max(80))
    .max(30)
    .default([])
    .transform((names) => names.filter(Boolean)),
  language: z.enum(languageValues).default("en"),
  durationSeconds: z
    .number()
    .finite()
    .min(0)
    .max(86_400)
    .nullable()
    .optional(),
});

export const evidenceSchema = z.object({
  segmentId: z.string().trim().max(120).default(""),
  timestampSeconds: z.coerce.number().min(0).max(86_400).nullable().default(null),
  quote: z.string().trim().max(600).default(""),
});

export const aiReportSchema = z.object({
  executiveSummary: z
    .object({
      purpose: cleanString(2_000),
      keyOutcomes: shortList,
      takeaways: shortList,
    })
    .default({ purpose: "", keyOutcomes: [], takeaways: [] }),
  discussionPoints: z
    .array(
      z.object({
        topic: cleanString(300),
        summary: cleanString(4_000),
        proposals: shortList,
        concerns: shortList,
        evidence: z.array(evidenceSchema).max(12).default([]),
      }),
    )
    .max(20)
    .default([]),
  speakerContributions: z
    .array(
      z.object({
        speakerId: cleanString(120),
        speakerName: cleanString(120),
        points: shortList,
        evidence: z.array(evidenceSchema).max(12).default([]),
      }),
    )
    .max(30)
    .default([]),
  decisions: z
    .array(
      z.object({
        description: cleanString(2_000),
        status: z.enum(["confirmed", "tentative"]).catch("tentative"),
        evidence: z.array(evidenceSchema).max(12).default([]),
      }),
    )
    .max(30)
    .default([]),
  actionItems: z
    .array(
      z.object({
        task: cleanString(1_000),
        owner: cleanString(120).default("Unassigned"),
        deadline: cleanString(120).default("Not specified"),
        priority: z
          .enum(["high", "medium", "low", "unspecified"])
          .catch("unspecified"),
        evidence: z.array(evidenceSchema).max(6).default([]),
      }),
    )
    .max(40)
    .default([]),
  openQuestions: z
    .array(
      z.object({
        question: cleanString(1_000),
        context: cleanString(2_000),
        evidence: z.array(evidenceSchema).max(12).default([]),
      }),
    )
    .max(30)
    .default([]),
  nextMeeting: z
    .object({
      proposedDate: z.string().trim().max(120).nullable().default(null),
      agenda: shortList,
    })
    .default({ proposedDate: null, agenda: [] }),
});

export type AiReport = z.infer<typeof aiReportSchema>;

export const reportEditSchema = z.object({
  executiveSummary: z
    .object({
      purpose: z.string().trim().max(2_000),
      keyOutcomes: z.array(z.string().trim().max(500)).max(24),
      takeaways: z.array(z.string().trim().max(500)).max(24),
    })
    .optional(),
  discussionPoints: z
    .array(
      z.object({
        topic: z.string().trim().max(300),
        summary: z.string().trim().max(4_000),
        proposals: z.array(z.string().trim().max(500)).max(24),
        concerns: z.array(z.string().trim().max(500)).max(24),
        evidence: z.array(evidenceSchema).optional(),
      }),
    )
    .max(20)
    .optional(),
  speakerContributions: z
    .array(
      z.object({
        speakerId: z.string().trim().max(120),
        speakerName: z.string().trim().max(120),
        points: z.array(z.string().trim().max(500)).max(24),
        evidence: z.array(evidenceSchema).optional(),
      }),
    )
    .max(30)
    .optional(),
  decisions: z
    .array(
      z.object({
        description: z.string().trim().max(2_000),
        status: z.enum(["confirmed", "tentative"]),
        evidence: z.array(evidenceSchema).optional(),
      }),
    )
    .max(30)
    .optional(),
  openQuestions: z
    .array(
      z.object({
        question: z.string().trim().max(1_000),
        context: z.string().trim().max(2_000),
        evidence: z.array(evidenceSchema).optional(),
      }),
    )
    .max(30)
    .optional(),
  nextMeeting: z
    .object({
      proposedDate: z.string().trim().max(120).nullable(),
      agenda: z.array(z.string().trim().max(500)).max(24),
    })
    .optional(),
});

export const actionItemSchema = z.object({
  task: z.string().trim().min(1).max(1_000),
  owner: z.string().trim().max(120).default("Unassigned"),
  deadline: z.string().trim().max(120).default("Not specified"),
  priority: z.enum(["high", "medium", "low", "unspecified"]).default("unspecified"),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  evidenceTimestamp: z.number().min(0).max(86_400).nullable().default(null),
  evidenceText: z.string().trim().max(1_000).nullable().default(null),
  sourceSegmentId: z.string().trim().max(120).nullable().default(null),
});

export const actionItemUpdateSchema = actionItemSchema.partial();

export const transcriptUpdateSchema = z.object({
  segments: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        text: z.string().trim().min(1).max(10_000),
        speakerLabel: z.string().trim().min(1).max(120),
      }),
    )
    .max(5_000)
    .optional(),
  speakerMap: z.record(z.string().max(120), z.string().trim().min(1).max(120)).optional(),
});

export const processMeetingSchema = z.object({
  generateRecap: z.boolean().default(false),
});

export const shareSchema = z.object({
  enabled: z.boolean(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
