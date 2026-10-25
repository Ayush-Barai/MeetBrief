import Link from "next/link";
import type { Metadata } from "next";
import {
  FileAudio,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { requireSessionUserId } from "@/lib/auth/session";
import { listMeetingDocs, meetingToDto } from "@/lib/meetings/repository";
import { isDatabaseConfigured } from "@/lib/config";
import type { MeetingStatus } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { MeetingCard } from "@/components/meetings/meeting-card";

export const metadata: Metadata = { title: "Meeting history" };
export const dynamic = "force-dynamic";

const statusValues = ["all", "uploaded", "processing", "completed", "failed"] as const;

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireSessionUserId();
  const params = await searchParams;
  const raw = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const search = (raw("q") ?? "").slice(0, 120);
  const statusRaw = raw("status") ?? "all";
  const status = statusValues.includes(statusRaw as (typeof statusValues)[number])
    ? (statusRaw as MeetingStatus | "all")
    : "all";
  const from = raw("from") ?? "";
  const to = raw("to") ?? "";

  let meetings: ReturnType<typeof meetingToDto>[] = [];
  let error: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      const docs = await listMeetingDocs(userId, {
        search: search || undefined,
        status,
        from: from || undefined,
        to: to || undefined,
        limit: 50,
      });
      meetings = docs.map(meetingToDto);
    } catch {
      error = "MongoDB could not be reached. Check the database configuration.";
    }
  } else {
    error = "MongoDB is not configured yet.";
  }

  const hasFilters = Boolean(search || status !== "all" || from || to);

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">History</p>
          <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">All meetings</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Search your reports, revisit action items, and return to the evidence.
          </p>
        </div>
        <ButtonLink href="/meetings/new">
          <Plus className="size-4" aria-hidden="true" />
          New meeting
        </ButtonLink>
      </div>

      <form className="mt-7 rounded-2xl border border-line bg-white p-4 shadow-soft md:p-5" method="get">
        <div className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto] md:items-end">
          <div className="relative">
            <label htmlFor="q" className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-wider text-ink-faint">
              Search
            </label>
            <Search className="pointer-events-none absolute bottom-3.5 left-3.5 size-3.5 text-ink-faint" aria-hidden="true" />
            <input
              id="q"
              name="q"
              defaultValue={search}
              placeholder="Search meeting titles…"
              className="h-10 w-full rounded-xl border border-line-strong bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-wider text-ink-faint">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="h-10 w-full rounded-xl border border-line-strong bg-white px-3 text-sm focus:border-accent focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Needs attention</option>
            </select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-wider text-ink-faint">
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="h-10 w-full rounded-xl border border-line-strong bg-white px-3 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-wider text-ink-faint">
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="h-10 w-full rounded-xl border border-line-strong bg-white px-3 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-white hover:bg-accent"
            >
              <Filter className="size-3.5" aria-hidden="true" /> Filter
            </button>
            {hasFilters ? (
              <Link
                href="/meetings"
                className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-xs font-medium text-ink-faint hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-3.5" aria-hidden="true" /> Clear
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      <div className="mt-6">
        {error ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
            <p className="text-sm font-medium">Meeting history is unavailable</p>
            <p className="mt-1.5 text-xs text-ink-faint">{error}</p>
            <Link href="/setup" className="mt-4 inline-block text-xs font-medium text-accent hover:underline">
              Check configuration
            </Link>
          </div>
        ) : meetings.length ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-ink-faint">
                {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
                {hasFilters ? " match your filters" : ""}
              </p>
              <p className="text-[0.65rem] text-ink-faint">Newest first</p>
            </div>
            <div className="rounded-2xl border border-line bg-white px-4 shadow-soft md:px-5">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
            {meetings.length === 50 ? (
              <p className="mt-3 text-center text-[0.65rem] text-ink-faint">
                Showing the 50 most recent matches. Narrow your search to find older meetings.
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-accent shadow-soft">
              <FileAudio className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium">
              {hasFilters ? "No meetings match those filters" : "No meetings saved yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-faint">
              {hasFilters
                ? "Try a different title, date range, or status."
                : "Create your first meeting report to start building a searchable record."}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              {hasFilters ? (
                <Link href="/meetings" className="inline-flex h-9 items-center justify-center rounded-full border border-line-strong bg-white px-4 text-xs font-medium hover:border-ink/30">
                  Clear filters
                </Link>
              ) : null}
              <ButtonLink href="/meetings/new" size="sm">
                <Plus className="size-3.5" aria-hidden="true" /> New meeting
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
