"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pencil,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { MeetingDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { apiFetch } from "@/lib/client-api";
import { deriveSpeakers } from "@/lib/speakers";
import { formatTimestamp } from "@/lib/utils";

export function SpeakerPanel({
  meeting,
  readOnly,
}: {
  meeting: MeetingDetail;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const speakers = deriveSpeakers(
    meeting.transcript,
    meeting.report?.speakerSuggestions ?? [],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!speakers.length) return null;

  const rename = (speakerId: string, rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/meetings/${meeting.id}/transcript`, {
          method: "PATCH",
          body: JSON.stringify({ speakerMap: { [speakerId]: name } }),
        });
        setEditingId(null);
        setDraft("");
        router.refresh();
      } catch (renameError) {
        setError((renameError as Error).message);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound
              className="size-4 text-accent"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold tracking-tight">Speakers</h2>
            <Badge tone="muted">{speakers.length}</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-[0.7rem] leading-relaxed text-ink-faint">
            Detected automatically from the recording. Rename a speaker once you
            can tell who spoke—the new name updates the transcript, report,
            action owners, and exports. Evidence quotes are never rewritten.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-[#fbeeec] p-3 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {speakers.map((speaker) => {
          const suggestion =
            speaker.suggestedName &&
            speaker.suggestedName.toLowerCase() !== speaker.label.toLowerCase()
              ? speaker.suggestedName
              : null;
          const isEditing = editingId === speaker.speakerId;

          return (
            <div
              key={speaker.speakerId}
              className="rounded-xl border border-line bg-paper/30 p-3.5"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-accent shadow-soft">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-ink">
                      {speaker.label}
                    </p>
                    <Badge tone="muted" className="font-mono text-[0.58rem]">
                      {speaker.speakerId}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[0.62rem] text-ink-faint">
                    {speaker.segmentCount} segment
                    {speaker.segmentCount === 1 ? "" : "s"} · first at{" "}
                    {formatTimestamp(speaker.firstSeenSeconds)}
                  </p>

                  {suggestion ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-accent/15 bg-accent-soft/50 px-2.5 py-1.5">
                      <Sparkles
                        className="size-3 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      <span className="text-[0.65rem] text-ink-soft">
                        AI suggests{" "}
                        <span className="font-semibold text-ink">
                          {suggestion}
                        </span>
                        {speaker.suggestionConfidence === "contextual"
                          ? " (possible)"
                          : ""}
                      </span>
                      {!readOnly ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="subtle"
                          className="ml-auto h-6 px-2 text-[0.62rem]"
                          onClick={() => rename(speaker.speakerId, suggestion)}
                          disabled={pending}
                        >
                          Use {suggestion}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {isEditing ? (
                    <div className="mt-3">
                      <Input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="e.g. Ayush"
                        maxLength={120}
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            rename(speaker.speakerId, draft);
                          }
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        aria-label={`Rename ${speaker.label}`}
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => rename(speaker.speakerId, draft)}
                          disabled={pending || !draft.trim()}
                        >
                          {pending ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          Save name
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={pending}
                        >
                          <X className="size-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : !readOnly ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 px-2 text-[0.65rem]"
                      onClick={() => {
                        setEditingId(speaker.speakerId);
                        setDraft(speaker.label);
                      }}
                    >
                      <Pencil className="size-3" aria-hidden="true" />
                      Rename speaker
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
