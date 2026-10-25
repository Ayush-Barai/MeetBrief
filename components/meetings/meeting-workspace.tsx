"use client";

import { useState } from "react";
import {
  AudioLines,
  FileText,
  Gavel,
  History,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { MeetingDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WorkspaceActions } from "@/components/meetings/workspace-actions";
import { OverviewPanel } from "@/components/meetings/overview-panel";
import { TranscriptPanel } from "@/components/meetings/transcript-panel";
import { DecisionsPanel } from "@/components/meetings/decisions-panel";
import { ActionsPanel } from "@/components/meetings/actions-panel";
import { RecapPanel } from "@/components/meetings/recap-panel";

type TabId = "overview" | "transcript" | "decisions" | "actions" | "recap";

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "transcript", label: "Transcript", icon: History },
  { id: "decisions", label: "Decisions", icon: Gavel },
  { id: "actions", label: "Action items", icon: ListChecks },
  { id: "recap", label: "Audio recap", icon: AudioLines },
];

export function MeetingWorkspace({
  meeting,
  readOnly,
  isShared,
  isDemo,
  downloadHref,
  sharedAudioSrc,
}: {
  meeting: MeetingDetail;
  readOnly?: boolean;
  isShared?: boolean;
  isDemo?: boolean;
  downloadHref?: string;
  sharedAudioSrc?: string;
}) {
  const [active, setActive] = useState<TabId>("overview");
  const [jumpSegmentId, setJumpSegmentId] = useState<string | null>(null);

  const report = meeting.report;

  const jumpToSegment = (segmentId: string) => {
    setActive("transcript");
    setJumpSegmentId(segmentId);
    window.setTimeout(() => {
      const element = document.getElementById(`segment-${segmentId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  if (!report) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <p className="text-sm font-medium">The report is not available yet.</p>
        <p className="mt-1 text-xs text-ink-faint">
          Refresh the page or retry processing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {isDemo ? <Badge tone="warning">Demo data</Badge> : null}
          {isShared ? <Badge tone="accent">Shared report · read only</Badge> : null}
          <Badge tone="neutral">{meeting.transcript.length} transcript segments</Badge>
          <Badge tone="neutral">{meeting.actionItems.length} tasks</Badge>
        </div>
        <WorkspaceActions
          meeting={meeting}
          readOnly={readOnly}
          downloadHref={downloadHref}
        />
      </div>

      <div className="no-print sticky top-[68px] z-30 -mx-1 mt-4 overflow-x-auto bg-paper/90 px-1 py-1 backdrop-blur">
        <div
          role="tablist"
          aria-label="Meeting report sections"
          className="flex min-w-max gap-1 rounded-full border border-line bg-white p-1 shadow-soft"
        >
          {tabs.map((tab) => {
            const count =
              tab.id === "decisions"
                ? report.decisions.length
                : tab.id === "actions"
                  ? meeting.actionItems.length
                  : tab.id === "transcript"
                    ? meeting.transcript.length
                    : null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.75rem] font-medium transition-colors sm:text-[0.8125rem]",
                  active === tab.id
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <tab.icon className="size-3.5" aria-hidden="true" />
                {tab.label}
                {count !== null ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-mono text-[0.6rem]",
                      active === tab.id ? "bg-white/15 text-white/80" : "bg-paper-deep text-ink-faint",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 animate-fade-in" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === "overview" ? (
          <OverviewPanel meeting={meeting} report={report} readOnly={readOnly} onJump={jumpToSegment} />
        ) : null}
        {active === "transcript" ? (
          <TranscriptPanel meeting={meeting} readOnly={readOnly} jumpSegmentId={jumpSegmentId} />
        ) : null}
        {active === "decisions" ? (
          <DecisionsPanel
            meeting={meeting}
            decisions={report.decisions}
            readOnly={readOnly}
            onJump={jumpToSegment}
          />
        ) : null}
        {active === "actions" ? (
          <ActionsPanel
            meetingId={meeting.id}
            initialItems={meeting.actionItems}
            readOnly={readOnly}
            onJump={jumpToSegment}
          />
        ) : null}
        {active === "recap" ? (
          <RecapPanel
            meeting={meeting}
            readOnly={readOnly}
            sharedAudioSrc={sharedAudioSrc}
          />
        ) : null}
      </div>

      {isDemo ? (
        <p className="mt-8 text-center text-[0.65rem] leading-relaxed text-ink-faint">
          This is a fictional demo. No real recording, transcript, or AI request is
          involved.
        </p>
      ) : null}
    </div>
  );
}
