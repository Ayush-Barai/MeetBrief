import { describe, expect, it } from "vitest";
import { buildRecapScript } from "@/lib/elevenlabs";

const report = {
  executiveSummary: {
    purpose: "Confirm launch readiness.",
    keyOutcomes: ["Launch remains on September 30."],
    takeaways: ["Legal review is the remaining risk."],
  },
  decisions: [
    { description: "Keep the launch date.", status: "confirmed" },
    { description: "Shorten the trial to 14 days.", status: "tentative" },
  ],
  openQuestions: [{ question: "When will legal approve?" }],
};

describe("buildRecapScript", () => {
  it("covers purpose, takeaways, decisions, tasks, and questions", () => {
    const script = buildRecapScript({
      title: "Launch readiness",
      report,
      actionItems: [
        { task: "Send copy to legal", owner: "Sarah", deadline: "Friday" },
        { task: "Book the room", owner: "Unassigned", deadline: "Not specified" },
      ],
    });
    expect(script).toContain("Launch readiness");
    expect(script).toContain("Purpose.");
    expect(script).toContain("The most important takeaways.");
    expect(script).toContain("Keep the launch date.");
    expect(script).toContain("This is tentative.");
    expect(script).toContain("assigned to Sarah");
    expect(script).toContain("due Friday");
    expect(script).toContain("unassigned");
    expect(script).toContain("no deadline specified");
    expect(script).toContain("Open questions.");
    expect(script).toContain("full report and transcript");
  });

  it("handles an empty meeting without inventing content", () => {
    const script = buildRecapScript({
      title: "Short sync",
      report: {
        executiveSummary: { purpose: "", keyOutcomes: [], takeaways: [] },
        decisions: [],
        openQuestions: [],
      },
      actionItems: [],
    });
    expect(script).toContain("No firm decisions were recorded.");
    expect(script).toContain("There were no action items.");
    expect(script).not.toContain("assigned to");
  });

  it("caps very long scripts", () => {
    const script = buildRecapScript({
      title: "Long meeting",
      report: {
        executiveSummary: {
          purpose: "A".repeat(10_000),
          keyOutcomes: [],
          takeaways: [],
        },
        decisions: [],
        openQuestions: [],
      },
      actionItems: [],
    });
    expect(script.length).toBeLessThanOrEqual(4_900);
  });
});
