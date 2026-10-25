import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { DEMO_MEETING, DEMO_NOTICE } from "@/lib/demo";
import { MeetingWorkspace } from "@/components/meetings/meeting-workspace";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Demo meeting report",
  description:
    "Explore a complete MeetBrief AI meeting report with a summary, decisions, action items, evidence, and transcript.",
};

export default function DemoPage() {
  return (
    <div className="container-page py-8 md:py-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-clay/25 bg-clay-soft/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-clay/10 text-clay">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              Interactive demo <Badge tone="warning">Demo data</Badge>
            </p>
            <p className="mt-0.5 max-w-2xl text-[0.7rem] leading-relaxed text-ink-soft">
              {DEMO_NOTICE} Explore every tab—no account required.
            </p>
          </div>
        </div>
        <ButtonLink href="/meetings/new" size="sm">
          Create your own
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </ButtonLink>
      </div>

      <header className="mt-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Demo report</Badge>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-faint">
            Fictional meeting
          </span>
        </div>
        <h1 className="display mt-3 text-balance text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">
          {DEMO_MEETING.title}
        </h1>
        <p className="mt-2 text-xs text-ink-faint">
          September 18, 2026 · 41 minutes · 4 speakers
        </p>
      </header>

      <div className="mt-6">
        <MeetingWorkspace meeting={DEMO_MEETING} readOnly isDemo />
      </div>

      <div className="no-print mt-12 rounded-2xl border border-line bg-white p-6 text-center shadow-soft md:p-8">
        <h2 className="display text-2xl">This is what your next meeting can look like.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
          Upload a recording and let MeetBrief handle the notes. You can review
          every claim against the transcript before sharing anything.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <ButtonLink href="/meetings/new">
            Create a Meeting Report
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
