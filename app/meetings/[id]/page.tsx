import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Clock3, Globe2, UsersRound } from "lucide-react";
import { requireSessionUserId } from "@/lib/auth/session";
import { loadMeetingDetail } from "@/lib/meetings/repository";
import { StatusBadge } from "@/components/ui/badge";
import { MeetingWorkspace } from "@/components/meetings/meeting-workspace";
import { MeetingCapturePanel } from "@/components/meetings/meeting-capture-panel";
import {
  formatDate,
  formatDuration,
  formatTimestamp,
  languageLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: "Meeting report", robots: { index: false, follow: false }, other: { meeting: id } };
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireSessionUserId();
  const { id } = await params;
  const meeting = await loadMeetingDetail(userId, id);
  if (!meeting) notFound();

  return (
    <div className="container-page py-8 md:py-10">
      <Link
        href="/meetings"
        className="no-print inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All meetings
      </Link>

      <header className="mt-5 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={meeting.status} />
              {meeting.isDemo ? null : (
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-faint">
                  Meeting {meeting.id.slice(-6)}
                </span>
              )}
            </div>
            <h1 className="display mt-3 text-balance text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">
              {meeting.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {formatDate(meeting.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden="true" />
                {formatDuration(meeting.durationSeconds)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="size-3.5" aria-hidden="true" />
                {languageLabel(meeting.language)}
              </span>
              {meeting.participantNames.length ? (
                <span className="inline-flex items-center gap-1.5">
                  <UsersRound className="size-3.5" aria-hidden="true" />
                  {meeting.participantNames.join(", ")}
                </span>
              ) : null}
            </div>
          </div>
          {meeting.report ? (
            <p className="rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[0.62rem] text-ink-faint">
              Generated {formatDate(meeting.report.generatedAt)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-6">
        {meeting.status === "completed" && meeting.report ? (
          <MeetingWorkspace meeting={meeting} />
        ) : (
          <MeetingCapturePanel meeting={meeting} />
        )}
      </div>
    </div>
  );
}
