import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Clock3,
  FileText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_MEETING, DEMO_NOTICE } from "@/lib/demo";
import { deriveSpeakers } from "@/lib/speakers";
import { formatDuration, formatTimestamp } from "@/lib/utils";

const principles = [
  { label: "Consent-first capture", icon: ShieldCheck },
  { label: "Evidence-linked claims", icon: FileText },
  { label: "Speaker-aware reports", icon: UsersRound },
  { label: "Audio recaps, not slog", icon: AudioLines },
];

export default function LandingPage() {
  const demo = DEMO_MEETING;
  const report = demo.report!;

  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <div className="container-page grid gap-14 py-16 md:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-28">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-soft">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-30" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              AI meeting intelligence, without the busywork
            </div>
            <h1 className="display text-balance text-[2.8rem] leading-[1.02] sm:text-6xl lg:text-[4.2rem]">
              Your meetings end.
              <span className="mt-2 block text-accent">Your next steps don&apos;t get lost.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
              MeetBrief turns conversations into clear summaries, decisions,
              assigned tasks, and audio recaps—ready to share with your team.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/meetings/new" size="lg" className="group">
                Create a Meeting Report
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/demo" variant="secondary" size="lg">
                Explore the demo
              </ButtonLink>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-accent" aria-hidden="true" />
                No sign-in to explore the demo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-accent" aria-hidden="true" />
                Consent-first recording
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-accent" aria-hidden="true" />
                Installable on your phone
              </span>
            </div>
          </div>

          <div className="relative animate-fade-up lg:pl-4" style={{ animationDelay: "120ms" }}>
            <div className="absolute -left-5 top-16 hidden h-32 w-px bg-gradient-to-b from-transparent via-line-strong to-transparent lg:block" />
            <div className="relative overflow-hidden rounded-[1.4rem] border border-line-strong bg-white shadow-lift">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent" />
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">
                    Meeting report
                  </span>
                </div>
                <Badge tone="warning">Demo data</Badge>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="display text-xl leading-tight sm:text-2xl">{demo.title}</h2>
                    <p className="mt-1.5 text-xs text-ink-faint">
                      Sep 18, 2026 · {formatDuration(demo.durationSeconds)} ·{" "}
                      {deriveSpeakers(demo.transcript).length} speakers
                    </p>
                  </div>
                  <span className="hidden rounded-full border border-accent/15 bg-accent-soft px-2.5 py-1 text-[0.65rem] font-medium text-accent-deep sm:block">
                    Ready
                  </span>
                </div>

                <div className="mt-5 rounded-xl bg-paper p-4">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
                    Executive summary
                  </p>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                    {report.executiveSummary.purpose}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-4">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
                      Decisions
                    </p>
                    <ul className="mt-2.5 space-y-2.5">
                      {report.decisions.slice(0, 2).map((decision) => (
                        <li key={decision.description} className="flex gap-2 text-[0.75rem] leading-snug text-ink-soft">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                          <span>{decision.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-line p-4">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
                      Action items
                    </p>
                    <ul className="mt-2.5 space-y-2.5">
                      {demo.actionItems.slice(0, 2).map((item) => (
                        <li key={item.id} className="text-[0.75rem] leading-snug">
                          <span className="flex gap-2 text-ink-soft">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full border border-ink-faint" />
                            {item.task}
                          </span>
                          <span className="ml-3.5 mt-0.5 block text-[0.65rem] text-ink-faint">
                            {item.owner} · {item.deadline}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
                      <AudioLines className="size-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[0.7rem] font-medium text-ink">Audio recap</p>
                      <p className="text-[0.62rem] text-ink-faint">2:14 · ElevenLabs voice</p>
                    </div>
                  </div>
                  <div className="flex h-6 items-end gap-0.5" aria-hidden="true">
                    {[3, 5, 2, 6, 4, 6, 3, 5, 6, 2, 4, 5, 3, 6, 4].map((height, index) => (
                      <span
                        key={index}
                        className="w-0.5 rounded-full bg-accent/50"
                        style={{ height: `${height * 4}px` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[0.65rem] text-ink-faint">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  Evidence-linked. {report.decisions[0].evidence.length} timestamps attached to this decision.
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[0.65rem] leading-relaxed text-ink-faint">
              {DEMO_NOTICE}
            </p>
          </div>
        </div>

        <div className="border-t border-line/80 bg-white/40">
          <div className="container-page grid grid-cols-2 gap-x-6 gap-y-4 py-5 md:grid-cols-4">
            {principles.map((principle) => (
              <div key={principle.label} className="flex items-center gap-2 text-xs text-ink-soft">
                <principle.icon className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
                {principle.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white/45 py-20 md:py-28">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Built for careful teams</p>
            <h2 className="display mt-3 text-balance text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">
              Useful details, not a wall of text.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
            <div className="bg-white p-7 md:p-9">
              <Sparkles className="size-5 text-accent" strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">Smart summaries</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                Purpose, outcomes, and takeaways shaped for someone who missed
                the meeting—not a generic paragraph generator.
              </p>
              <div className="mt-6 rounded-xl bg-paper p-4 text-xs leading-relaxed text-ink-soft">
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-faint">Key outcome</span>
                <p className="mt-1.5">Launch remains on track for September 30.</p>
              </div>
            </div>
            <div className="bg-white p-7 md:p-9">
              <UsersRound className="size-5 text-accent" strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">Speaker-attributed decisions</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                See who proposed what, which decisions were confirmed, and the
                exact moment in the transcript that supports each claim.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="accent"><Check className="size-3" /> Confirmed · 2:29</Badge>
                <Badge tone="warning">Tentative · 6:26</Badge>
                <Badge tone="neutral">Context · 20:48</Badge>
              </div>
            </div>
            <div className="bg-white p-7 md:p-9">
              <FileText className="size-5 text-accent" strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">Action items with owners</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                Tasks stay grounded in the conversation. Missing owners become
                “Unassigned,” never invented. Update status as work progresses.
              </p>
              <div className="mt-6 space-y-2 rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-ink">Send trial copy to legal</span>
                  <Badge tone="warning">In progress</Badge>
                </div>
                <div className="flex items-center justify-between text-[0.65rem] text-ink-faint">
                  <span>Daniel Okafor</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> Sep 22</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-7 md:p-9">
              <AudioLines className="size-5 text-accent" strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">Audio recaps</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                A concise spoken briefing generated with ElevenLabs from the
                report: purpose, takeaways, decisions, tasks, and open questions.
              </p>
              <div className="mt-6 flex items-center gap-4 rounded-xl bg-ink p-4 text-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10">
                  <span className="ml-0.5 block size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-1 rounded-full bg-white/20">
                    <div className="h-1 w-2/5 rounded-full bg-[#8fd6bf]" />
                  </div>
                  <p className="mt-2 text-[0.65rem] text-white/60">Recap · 2:14</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="sample" className="border-b border-line py-20 md:py-28">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="eyebrow">Sample report</p>
              <h2 className="display mt-3 text-balance text-3xl leading-tight sm:text-4xl">
                See exactly what you leave with.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
                Every report separates discussion, decisions, and assignments.
                Demo data is clearly labelled and the full example is open
                without an account.
              </p>
              <ButtonLink href="/demo" variant="secondary" className="mt-6 group">
                Open the full demo report
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </ButtonLink>
              <div className="mt-8 rounded-xl border border-line bg-white/60 p-4 text-xs leading-relaxed text-ink-faint">
                <span className="font-medium text-ink-soft">What makes it different:</span>{" "}
                each decision and task links back to a timestamped transcript
                quote. Uncertainty is surfaced instead of smoothed over.
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line-strong bg-white shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">Demo report</p>
                  <h3 className="display mt-1 text-xl">{demo.title}</h3>
                </div>
                <Badge tone="accent">Completed</Badge>
              </div>
              <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
                <div className="md:col-span-2">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">Executive summary</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{report.executiveSummary.purpose}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {report.executiveSummary.keyOutcomes.slice(0, 4).map((outcome) => (
                      <div key={outcome} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                        {outcome}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">Decisions</p>
                  <div className="mt-3 space-y-3">
                    {report.decisions.map((decision) => (
                      <div key={decision.description} className="rounded-xl border border-line p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs leading-relaxed text-ink-soft">{decision.description}</p>
                          <Badge tone={decision.status === "confirmed" ? "accent" : "warning"}>
                            {decision.status}
                          </Badge>
                        </div>
                        {decision.evidence[0] ? (
                          <p className="mt-2.5 border-t border-line pt-2.5 text-[0.65rem] leading-relaxed text-ink-faint">
                            {formatTimestamp(decision.evidence[0].timestampSeconds)} · “{decision.evidence[0].quote}”
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">Action items</p>
                  <div className="mt-3 divide-y divide-line rounded-xl border border-line">
                    {demo.actionItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-4">
                        <p className="text-xs font-medium leading-relaxed text-ink">{item.task}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-ink-faint">
                          <span>{item.owner}</span>
                          <span>·</span>
                          <span>{item.deadline}</span>
                          <Badge tone={item.priority === "high" ? "danger" : "neutral"}>{item.priority}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="rounded-xl bg-paper-deep/50 p-4 text-[0.68rem] leading-relaxed text-ink-faint">
                    {DEMO_NOTICE}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="privacy" className="border-b border-line bg-ink py-20 text-paper md:py-28">
        <div className="container-page grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[#8fd6bf]">
              Privacy & consent
            </p>
            <h2 className="display mt-3 text-balance text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">
              Recording a conversation is a responsibility.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
              MeetBrief asks you to confirm consent before any audio is
              processed. Recordings and reports are owned by your browser
              session, and share links use unguessable tokens you control.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {[
              ["Visible capture", "A persistent indicator shows when the microphone is active."],
              ["Private by default", "No public report URLs. Sharing is explicit and revocable."],
              ["Evidence, not certainty", "AI claims link to transcript timestamps you can inspect."],
              ["Deletion is real", "Deleting a meeting removes its audio, report, tasks, and recap."],
              ["No secret in the browser", "ElevenLabs and AI keys stay on the server."],
              ["Honest limits", "AI can make mistakes. Reports are not a legal record."],
            ].map(([title, body]) => (
              <div key={title} className="bg-ink p-5 md:p-6">
                <ShieldCheck className="size-4 text-[#8fd6bf]" strokeWidth={1.7} aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-line-strong bg-white px-6 py-12 text-center shadow-soft md:px-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#e3efe9_0%,transparent_55%)]" />
            <div className="relative mx-auto max-w-2xl">
              <p className="eyebrow">Next meeting, covered</p>
              <h2 className="display mt-3 text-balance text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">
                Leave the call. Keep the clarity.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
                Upload a recording and get a shareable report with decisions,
                action items, and a spoken recap. Explore the demo first—no
                account required.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/meetings/new" size="lg">
                  Create a Meeting Report
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/demo" variant="secondary" size="lg">
                  Explore the demo
                </ButtonLink>
              </div>
              <p className="mt-4 text-[0.65rem] text-ink-faint">
                Recording, transcription, AI analysis, and synchronization require an internet connection.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
