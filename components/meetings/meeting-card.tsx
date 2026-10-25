import Link from "next/link";
import { ArrowUpRight, Clock3, Globe2 } from "lucide-react";
import type { Meeting } from "@/types";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatDuration, languageLabel, relativeTime } from "@/lib/utils";

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group flex items-start justify-between gap-4 border-b border-line px-1 py-4 last:border-0 hover:bg-ink/[0.015] sm:px-2"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-ink group-hover:text-accent">{meeting.title}</p>
          <StatusBadge status={meeting.status} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-ink-faint">
          <span>{formatDate(meeting.createdAt)}</span>
          {meeting.durationSeconds ? (
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3" aria-hidden="true" /> {formatDuration(meeting.durationSeconds)}</span>
          ) : null}
          <span className="inline-flex items-center gap-1"><Globe2 className="size-3" aria-hidden="true" /> {languageLabel(meeting.language)}</span>
          <span className="hidden sm:inline">{relativeTime(meeting.updatedAt)}</span>
        </div>
      </div>
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors group-hover:bg-accent-soft group-hover:text-accent">
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
