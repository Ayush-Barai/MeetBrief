"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Tags,
  UsersRound,
  X,
} from "lucide-react";
import type { MeetingDetail, TranscriptSegment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { apiFetch } from "@/lib/client-api";
import { deriveSpeakers } from "@/lib/speakers";
import { cn, formatTimestamp } from "@/lib/utils";

export function TranscriptPanel({
  meeting,
  readOnly,
  jumpSegmentId,
}: {
  meeting: MeetingDetail;
  readOnly?: boolean;
  jumpSegmentId: string | null;
}) {
  const router = useRouter();
  const segments = meeting.transcript;
  const [search, setSearch] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const segment of segments) map[segment.speakerId] = segment.speakerLabel;
    return map;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const speakers = useMemo(
    () => deriveSpeakers(segments, meeting.report?.speakerSuggestions ?? []),
    [segments, meeting.report?.speakerSuggestions],
  );

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const segment of segments) map[segment.speakerId] = segment.speakerLabel;
    setSpeakerMap(map);
  }, [segments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return segments;
    return segments.filter(
      (segment) =>
        segment.text.toLowerCase().includes(query) ||
        segment.speakerLabel.toLowerCase().includes(query),
    );
  }, [segments, search]);

  const applyMap = () => {
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/meetings/${meeting.id}/transcript`, {
          method: "PATCH",
          body: JSON.stringify({ speakerMap }),
        });
        setMapOpen(false);
        router.refresh();
      } catch (mapError) {
        setError((mapError as Error).message);
      }
    });
  };

  const saveSegment = (segment: TranscriptSegment) => {
    if (!draftText.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/meetings/${meeting.id}/transcript`, {
          method: "PATCH",
          body: JSON.stringify({
            segments: [
              {
                id: segment.id,
                text: draftText.trim(),
                speakerLabel: segment.speakerLabel,
              },
            ],
          }),
        });
        setEditingId(null);
        router.refresh();
      } catch (saveError) {
        setError((saveError as Error).message);
      }
    });
  };

  if (!segments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink">No transcript available</p>
        <p className="mt-1.5 text-xs text-ink-faint">
          The transcription step has not produced segments for this meeting.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="display text-2xl">Transcript</h2>
            <Badge tone="muted">{segments.length} segments</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {meeting.transcriptMeta
              ? `${meeting.transcriptMeta.provider} · ${meeting.transcriptMeta.model} · ${meeting.transcriptMeta.diarized ? "diarized speaker labels" : "speaker diarization unavailable"}`
              : "Transcript segments"}
            . Speakers are labeled automatically. Rename them once you can tell
            who spoke.
          </p>
        </div>
        {!readOnly ? (
          <Button variant="secondary" size="sm" onClick={() => setMapOpen((value) => !value)}>
            <Tags className="size-3.5" aria-hidden="true" /> Rename speakers
          </Button>
        ) : null}
      </div>

      {mapOpen && !readOnly ? (
        <div className="mt-5 rounded-2xl border border-accent/20 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Rename speakers</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Only rename a speaker when the transcript or your own knowledge
                supports it. Voice does not prove identity. Changes update the
                transcript, report, action owners, and exports.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMapOpen(false)}
              className="grid size-7 place-items-center rounded-full hover:bg-paper"
              aria-label="Close speaker mapping"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {speakers.map((speaker) => {
              const suggestion =
                speaker.suggestedName &&
                speaker.suggestedName.toLowerCase() !== speaker.label.toLowerCase()
                  ? speaker.suggestedName
                  : null;
              return (
                <div
                  key={speaker.speakerId}
                  className="rounded-xl border border-line p-3"
                >
                  <label className="mb-1 flex items-center justify-between text-[0.7rem] text-ink-faint" htmlFor={`map-${speaker.speakerId}`}>
                    <span className="font-mono">{speaker.speakerId}</span>
                    <span>
                      {speaker.segmentCount} segment
                      {speaker.segmentCount === 1 ? "" : "s"}
                    </span>
                  </label>
                  <Input
                    id={`map-${speaker.speakerId}`}
                    value={speakerMap[speaker.speakerId] ?? speaker.label}
                    onChange={(event) =>
                      setSpeakerMap({
                        ...speakerMap,
                        [speaker.speakerId]: event.target.value,
                      })
                    }
                    placeholder="Speaker name"
                  />
                  {suggestion ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSpeakerMap({
                          ...speakerMap,
                          [speaker.speakerId]: suggestion,
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-1 text-[0.62rem] font-medium text-accent-deep hover:bg-[#d7e9e0]"
                    >
                      <Sparkles className="size-2.5" aria-hidden="true" />
                      AI suggests {suggestion}
                      {speaker.suggestionConfidence === "contextual"
                        ? " (possible)"
                        : ""}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMapOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={applyMap} disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Apply labels
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 rounded-lg bg-[#fbeeec] p-3 text-xs text-danger">{error}</p> : null}

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the transcript…"
          className="pl-9"
          aria-label="Search transcript"
        />
      </div>

      <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        {filtered.map((segment) => {
          const uncertain = segment.confidence !== null && segment.confidence < 0.75;
          const highlighted = jumpSegmentId === segment.id;
          return (
            <article
              key={segment.id}
              id={`segment-${segment.id}`}
              className={cn(
                "scroll-mt-24 px-5 py-4 transition-colors",
                highlighted && "bg-accent-soft/50",
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 shrink-0 pt-0.5">
                  <p className="font-mono text-[0.65rem] text-ink-faint">
                    {formatTimestamp(segment.startSeconds)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.7rem] font-semibold text-accent">
                      {segment.speakerLabel}
                    </p>
                    {uncertain ? (
                      <span className="inline-flex items-center gap-1 text-[0.6rem] text-clay" title="Lower transcription confidence">
                        <AlertCircle className="size-2.5" aria-hidden="true" />
                        uncertain
                      </span>
                    ) : null}
                    <span className="font-mono text-[0.58rem] text-ink-faint/60">{segment.id.slice(-6)}</span>
                  </div>
                  {editingId === segment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
                        aria-label="Edit transcript segment"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => saveSegment(segment)} disabled={pending}>
                          {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">{segment.text}</p>
                  )}
                </div>
                {!readOnly && editingId !== segment.id ? (
                  <button
                    type="button"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-ink-faint opacity-0 transition-opacity hover:bg-paper hover:text-ink focus:opacity-100 group-hover:opacity-100 md:opacity-60"
                    onClick={() => {
                      setEditingId(segment.id);
                      setDraftText(segment.text);
                    }}
                    aria-label="Edit transcript segment"
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {!filtered.length ? (
          <p className="px-5 py-10 text-center text-xs text-ink-faint">
            No segments match “{search}”.
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-[0.68rem] leading-relaxed text-ink-faint">
        Transcripts are machine-generated and can contain errors. Editing a
        segment does not automatically update the report; review claims against
        the corrected text.
      </p>
    </div>
  );
}
