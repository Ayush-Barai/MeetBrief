import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileAudio,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Upload,
  UsersRound,
} from "lucide-react";
import { requireSessionUserId } from "@/lib/auth/session";
import {
  getMeetingStats,
  listMeetingDocs,
  listPendingActions,
  meetingToDto,
  type PendingActionRow,
} from "@/lib/meetings/repository";
import { getIntegrationStatus } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/config";
import type { MeetingStats, Meeting } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { MeetingCard } from "@/components/meetings/meeting-card";
import { InstallButton } from "@/components/install-button";
import { formatDate, formatDuration, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireSessionUserId();
  const integrations = getIntegrationStatus();

  let stats: MeetingStats | null = null;
  let recent: Meeting[] = [];
  let processing: Meeting[] = [];
  let pending: PendingActionRow[] = [];
  let dbError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const [statsResult, recentDocs, allDocs, pendingActions] = await Promise.all([
        getMeetingStats(userId),
        listMeetingDocs(userId, { limit: 5 }),
        listMeetingDocs(userId, { status: "processing", limit: 5 }),
        listPendingActions(userId, 5),
      ]);
      stats = statsResult;
      recent = recentDocs.map(meetingToDto);
      processing = allDocs.map(meetingToDto);
      pending = pendingActions;
    } catch {
      dbError =
        "MongoDB could not be reached. Check MONGODB_URI and Atlas network access in Render.";
    }
  } else {
    dbError = "MongoDB is not configured. Add MONGODB_URI to start saving meetings.";
  }

  const hasMeetings = (stats?.total ?? 0) > 0;
  const missingIntegrations = [
    !integrations.database.configured ? "MongoDB" : null,
    !integrations.transcription.configured ? "transcription" : null,
    !integrations.gemma.configured ? "Gemma" : null,
    !integrations.elevenlabs.configured ? "ElevenLabs" : null,
  ].filter(Boolean);

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">
            Your meeting record.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Everything discussed, decided, and assigned—kept in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InstallButton />
          <ButtonLink href="/meetings/new" className="group">
            <Plus className="size-4" aria-hidden="true" />
            New meeting
          </ButtonLink>
        </div>
      </div>

      {dbError ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-clay/25 bg-clay-soft/60 px-4 py-3 text-xs text-clay">
          <span className="inline-flex items-center gap-2">
            <Settings2 className="size-3.5" aria-hidden="true" />
            {dbError}
          </span>
          <Link href="/setup" className="font-medium underline">Open setup guide</Link>
        </div>
      ) : null}

      {!dbError && missingIntegrations.length ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-clay" aria-hidden="true" />
            Not yet configured: {missingIntegrations.join(", ")}. Uploads work, but some steps are unavailable.
          </span>
          <Link href="/setup" className="font-medium text-accent hover:underline">View setup</Link>
        </div>
      ) : null}

      {stats ? (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total meetings",
              value: stats.total,
              icon: FileText,
              detail: stats.completed ? `${stats.completed} with reports` : "No reports yet",
            },
            {
              label: "Open tasks",
              value: stats.pendingActions,
              icon: ListChecks,
              detail: stats.pendingActions ? "Waiting for follow-through" : "Nothing outstanding",
            },
            {
              label: "Processing",
              value: stats.processing,
              icon: stats.processing ? Loader2 : CheckCircle2,
              detail: stats.processing ? "Working in the background" : "All caught up",
            },
            {
              label: "Captured",
              value: stats.totalMinutes >= 60 ? `${(stats.totalMinutes / 60).toFixed(1)}h` : `${stats.totalMinutes}m`,
              icon: Clock3,
              detail: "Total meeting time",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white p-4 shadow-soft md:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.68rem] font-medium uppercase tracking-wider text-ink-faint">{item.label}</p>
                <item.icon className={`size-3.5 text-ink-faint ${item.label === "Processing" && stats.processing ? "animate-spin text-clay" : ""}`} aria-hidden="true" />
              </div>
              <p className="mt-3 font-mono text-2xl tabular-nums text-ink md:text-3xl">{item.value}</p>
              <p className="mt-1 text-[0.65rem] text-ink-faint">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          {processing.length ? (
            <section className="rounded-2xl border border-clay/20 bg-white p-5 shadow-soft md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-clay" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Processing now</h2>
                </div>
                <Badge tone="warning">{processing.length}</Badge>
              </div>
              <div className="mt-3 divide-y divide-line">
                {processing.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="flex items-center justify-between gap-3 py-3 text-xs hover:text-accent"
                  >
                    <span>
                      <span className="block font-medium text-ink">{meeting.title}</span>
                      <span className="mt-0.5 block text-[0.65rem] text-ink-faint">
                        {meeting.processingStage.replace("_", " ")} · started {relativeTime(meeting.createdAt)}
                      </span>
                    </span>
                    <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Recent meetings</h2>
              <Link href="/meetings" className="text-[0.7rem] font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
            {recent.length ? (
              <div className="mt-2">
                {recent.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-paper/40 px-5 py-10 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-accent shadow-soft">
                  <FileAudio className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-medium">No meetings yet</p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-faint">
                  Upload a real recording or record with consent. Your first
                  structured report is a few steps away.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <ButtonLink href="/meetings/new" size="sm">
                    <Upload className="size-3.5" aria-hidden="true" />
                    Upload a recording
                  </ButtonLink>
                  <ButtonLink href="/demo" variant="secondary" size="sm">
                    See a demo report
                  </ButtonLink>
                </div>
              </div>
            )}
          </section>

          {!hasMeetings && stats ? (
            <section className="rounded-2xl border border-line bg-paper-deep/40 p-5 md:p-6">
              <h2 className="display text-2xl">Three steps to your first report</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {[
                  { icon: Upload, title: "Upload or record", body: "Add a meeting recording after confirming consent." },
                  { icon: Sparkles, title: "Let AI analyze", body: "Get a transcript, summary, decisions, and tasks." },
                  { icon: CheckCircle2, title: "Review and share", body: "Check evidence, edit, then share or generate audio." },
                ].map((step, index) => (
                  <div key={step.title}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[0.62rem] text-ink-faint">0{index + 1}</span>
                      <step.icon className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-xs font-semibold">{step.title}</p>
                    <p className="mt-1 text-[0.68rem] leading-relaxed text-ink-faint">{step.body}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
                <h2 className="text-sm font-semibold">Open action items</h2>
              </div>
              {pending.length ? <Badge tone="warning">{pending.length}</Badge> : null}
            </div>
            {pending.length ? (
              <div className="mt-4 space-y-4">
                {pending.map((item) => (
                  <Link key={item.id} href={`/meetings/${item.meetingId}`} className="block group">
                    <p className="text-xs font-medium leading-relaxed text-ink group-hover:text-accent">
                      {item.task}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-ink-faint">
                      <span className="inline-flex items-center gap-1"><UsersRound className="size-2.5" /> {item.owner}</span>
                      <span>{item.deadline}</span>
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <p className="mt-1 truncate text-[0.6rem] text-ink-faint/70">{item.meetingTitle}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-paper p-4 text-center">
                <CheckCircle2 className="mx-auto size-5 text-accent" aria-hidden="true" />
                <p className="mt-2 text-xs font-medium">Nothing waiting</p>
                <p className="mt-1 text-[0.65rem] text-ink-faint">
                  Tasks from your meetings will appear here.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-paper-deep/50 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold">Integration status</h2>
              <Link href="/setup" className="text-[0.65rem] font-medium text-accent hover:underline">Setup</Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {[
                ["MongoDB", integrations.database.configured],
                ["Transcription", integrations.transcription.configured],
                ["Gemma", integrations.gemma.configured],
                ["ElevenLabs", integrations.elevenlabs.configured],
              ].map(([label, configured]) => (
                <li key={String(label)} className="flex items-center justify-between gap-2 text-[0.7rem]">
                  <span className="text-ink-soft">{label}</span>
                  <span className={`inline-flex items-center gap-1.5 ${configured ? "text-accent" : "text-ink-faint"}`}>
                    <span className={`size-1.5 rounded-full ${configured ? "bg-accent" : "bg-ink-faint/40"}`} />
                    {configured ? "Ready" : "Not set"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/demo"
            className="group block rounded-2xl border border-line bg-ink p-5 text-paper transition-colors hover:bg-accent-deep"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[#8fd6bf]">Demo</span>
              <ArrowUpRight className="size-4 text-white/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-medium">See a complete report</p>
            <p className="mt-1.5 text-[0.68rem] leading-relaxed text-white/50">
              Explore how decisions, evidence, tasks, and recaps fit together.
            </p>
          </Link>

          {recent[0] ? (
            <p className="px-1 text-[0.65rem] leading-relaxed text-ink-faint">
              Last activity: {formatDate(recent[0].updatedAt)} · {formatDuration(recent[0].durationSeconds)} captured.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
