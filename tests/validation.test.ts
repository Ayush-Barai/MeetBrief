import { describe, expect, it } from "vitest";
import { actionItemSchema, createMeetingSchema } from "@/lib/validation/schemas";
import { formatTimestamp } from "@/lib/utils";

describe("createMeetingSchema", () => {
  it("normalizes a valid meeting without requiring participant names", () => {
    const result = createMeetingSchema.parse({
      title: "  Q3 launch  ",
      participantNames: ["Maya"],
      language: "en",
      durationSeconds: 120,
    });
    expect(result.title).toBe("Q3 launch");
    expect(result.language).toBe("en");
    expect("participantNames" in result).toBe(false);
  });

  it("rejects a missing title and unsupported language", () => {
    expect(createMeetingSchema.safeParse({ title: "a", language: "en" }).success).toBe(false);
    expect(
      createMeetingSchema.safeParse({ title: "Valid title", language: "xx" }).success,
    ).toBe(false);
  });
});

describe("actionItemSchema", () => {
  it("defaults missing owner and deadline without inventing data", () => {
    const result = actionItemSchema.parse({ task: "Send the deck" });
    expect(result.owner).toBe("Unassigned");
    expect(result.deadline).toBe("Not specified");
    expect(result.status).toBe("pending");
  });
});

describe("formatTimestamp", () => {
  it("formats seconds, minutes, and hours", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65)).toBe("1:05");
    expect(formatTimestamp(3_725)).toBe("1:02:05");
    expect(formatTimestamp(null)).toBe("—");
  });
});
