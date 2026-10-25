"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Gavel, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Decision, MeetingDetail } from "@/types";
import { DecisionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { EvidenceList } from "@/components/meetings/evidence-list";
import { apiFetch } from "@/lib/client-api";

export function DecisionsPanel({
  meeting,
  decisions,
  readOnly,
  onJump,
}: {
  meeting: MeetingDetail;
  decisions: Decision[];
  readOnly?: boolean;
  onJump: (segmentId: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Decision[]>(decisions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const beginEdit = () => {
    setDraft(decisions.map((decision) => ({ ...decision })));
    setEditing(true);
    setError(null);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/meetings/${meeting.id}/report`, {
          method: "PATCH",
          body: JSON.stringify({
            decisions: draft
              .filter((decision) => decision.description.trim())
              .map((decision) => ({
                description: decision.description.trim(),
                status: decision.status,
                evidence: decision.evidence,
              })),
          }),
        });
        setEditing(false);
        router.refresh();
      } catch (saveError) {
        setError((saveError as Error).message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gavel className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="display text-2xl">Decisions</h2>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Confirmed decisions differ from suggestions. Evidence links open the original transcript moment.
          </p>
        </div>
        {!readOnly ? (
          editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save decisions"}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={beginEdit}>
              <Pencil className="size-3" aria-hidden="true" /> Edit decisions
            </Button>
          )
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-lg bg-[#fbeeec] p-3 text-xs text-danger">{error}</p> : null}

      <div className="mt-6 space-y-4">
        {(editing ? draft : decisions).map((decision, index) => (
          <article key={`${decision.description}-${index}`} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[0.65rem] text-ink-faint">
                D{String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Select
                      aria-label="Decision status"
                      className="h-8 w-32 text-xs"
                      value={decision.status}
                      onChange={(event) => {
                        const next = [...draft];
                        next[index] = {
                          ...next[index],
                          status: event.target.value as Decision["status"],
                        };
                        setDraft(next);
                      }}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="tentative">Tentative</option>
                    </Select>
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-[#fbeeec] hover:text-danger"
                      onClick={() => setDraft(draft.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label="Remove decision"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <DecisionBadge status={decision.status} />
                )}
              </div>
            </div>
            {editing ? (
              <div className="mt-3">
                <Label htmlFor={`decision-${index}`} className="sr-only">
                  Decision {index + 1}
                </Label>
                <Textarea
                  id={`decision-${index}`}
                  rows={3}
                  value={decision.description}
                  onChange={(event) => {
                    const next = [...draft];
                    next[index] = { ...next[index], description: event.target.value };
                    setDraft(next);
                  }}
                />
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink">{decision.description}</p>
                <EvidenceList evidence={decision.evidence} onJump={onJump} />
              </>
            )}
          </article>
        ))}
        {editing ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setDraft([
                ...draft,
                { description: "", status: "tentative", evidence: [] },
              ])
            }
          >
            <Plus className="size-3.5" aria-hidden="true" /> Add decision
          </Button>
        ) : null}
        {!decisions.length && !editing ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">No decisions recorded</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-faint">
              The transcript may not contain a confirmed decision, or the model
              did not find enough evidence. You can add one manually.
            </p>
            {!readOnly ? (
              <Button className="mt-4" size="sm" variant="secondary" onClick={beginEdit}>
                <Plus className="size-3.5" aria-hidden="true" /> Add a decision
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-paper-deep/40 p-3 text-[0.68rem] leading-relaxed text-ink-faint">
          <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
          Changing decision text keeps existing transcript evidence attached. Removing a decision also removes its evidence from the report.
        </div>
      ) : null}
    </div>
  );
}
