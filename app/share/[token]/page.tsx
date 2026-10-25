import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, Globe2, Lock, UsersRound } from "lucide-react";
import { assembleDetail, getMeetingByShareHash } from "@/lib/meetings/repository";
import { hashShareToken, isValidShareTokenFormat } from "@/lib/share";
import { MeetingWorkspace } from "@/components/meetings/meeting-workspace";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration, languageLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared meeting report",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharedMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidShareTokenFormat(token)) notFound();
  const doc = await getMeetingByShareHash(hashShareToken(token));
  if (!doc || !doc.share) notFound();
  const meeting = await assembleDetail(doc);
  if (!meeting.report) notFound();

  return (
    <div className="container-page py-8 md:py-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-accent-deep">
          <Lock className="size-3.5" aria-hidden="true" />
          <span className="font-medium">Shared with you via MeetBrief AI</span>
          <Badge tone="accent">Read only</Badge>
        </div>
        <Link href="/" className="font-medium text-accent hover:underline">
          Create your own meeting report
        </Link>
      </div>

      <header className="mt-6 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Shared report</Badge>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-faint">
            Meeting {meeting.id.slice(-6)}
          </span>
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
      </header>

      <div className="mt-6">
        <MeetingWorkspace
          meeting={meeting}
          readOnly
          isShared
          downloadHref={`/api/share/${token}/export`}
          sharedAudioSrc={`/api/share/${token}/audio`}
        />
      </div>

      <p className="mt-10 border-t border-line pt-5 text-center text-[0.68rem] leading-relaxed text-ink-faint">
        This link is unguessable but not password-protected. Anyone with the URL
        can read the report. AI-generated content may contain mistakes.
      </p>
    </div>
  );
}
