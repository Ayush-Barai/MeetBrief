"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Lightbulb,
  MessageSquareText,
  Pencil,
  Quote,
  Target,
  X,
} from "lucide-react";
import type { MeetingDetail, MeetingReport } from "@/types";
import { Badge, DecisionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { EvidenceList } from "@/components/meetings/evidence-list";
import { apiFetch } from "@/lib/client-api";
import { cn, formatTimestamp } from "@/lib/utils";

export function OverviewPanel({
  meeting,
  report,
  readOnly,
  onJump,
}: {
  meeting: MeetingDetail;
  report: MeetingReport;
  readOnly?: boolean;
  onJump: (segmentId: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [purpose, setPurpose] = useState(report.executiveSummary.purpose);
  const [outcomes, setOutcomes] = useState(report.executiveSummary.keyOutcomes.join("\n"));
  const [takeaways, setTakeaways] = useState(report.executiveSummary.takeaways.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPurpose(report.executiveSummary.purpose);
    setOutcomes(report.executiveSummary.keyOutcomes.join("\n"));
    setTakeaways(report.executiveSummary.takeaways.join("\n"));
  }, [report]);

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/meetings/${meeting.id}/report`, {
          method: "PATCH",
          body: JSON.stringify({
            executiveSummary: {
              purpose: purpose.trim(),
              keyOutcomes: outcomes.split("\n").map((line) => line.trim()).filter(Boolean),
              takeaways: takeaways.split("\n").map((line) => line.trim()).filter(Boolean),
            },
          }),
        });
        setEditing(false);
        router.refresh();
      } catch (saveError) {
        setError((saveError as Error).message);
      }
    });
  };

  const summary = report.executiveSummary;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
              <h2 className="text-sm font-semibold tracking-tight">Executive summary</h2>
            </div>
            {!readOnly ? (
              editing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={pending}>
                    {pending ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-3" aria-hidden="true" /> Edit
                </Button>
              )
            ) : null}
          </div>

          {editing ? (
            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="summary-purpose">Meeting purpose</Label>
                <Textarea
                  id="summary-purpose"
                  rows={3}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="summary-outcomes">Key outcomes (one per line)</Label>
                <Textarea
                  id="summary-outcomes"
                  rows={4}
                  value={outcomes}
                  onChange={(event) => setOutcomes(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="summary-takeaways">Important takeaways (one per line)</Label>
                <Textarea
                  id="summary-takeaways"
                  rows={4}
                  value={takeaways}
                  onChange={(event) => setTakeaways(event.target.value)}
                />
              </div>
              {error ? <p className="text-xs text-danger">{error}</p> : null}
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{summary.purpose || "—"}</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
                    Key outcomes
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {summary.keyOutcomes.length ? (
                      summary.keyOutcomes.map((outcome) => (
                        <li key={outcome} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                          {outcome}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-ink-faint">No outcomes recorded.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
                    Important takeaways
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {summary.takeaways.length ? (
                      summary.takeaways.map((takeaway) => (
                        <li key={takeaway} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-clay" aria-hidden="true" />
                          {takeaway}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-ink-faint">No takeaways recorded.</li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
          {!editing && (report.editedAt || report.version > 1) ? (
            <p className="mt-5 border-t border-line pt-3 text-[0.65rem] text-ink-faint">
              Edited {report.editedAt ? new Date(report.editedAt).toLocaleString() : "after generation"} · version {report.version}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-tight">Discussion points</h2>
            <Badge tone="muted">{report.discussionPoints.length}</Badge>
          </div>
          <div className="mt-4 space-y-4">
            {report.discussionPoints.length ? (
              report.discussionPoints.map((point, index) => (
                <details
                  key={`${point.topic}-${index}`}
                  className="group rounded-xl border border-line bg-paper/40 open:bg-white"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                    <span className="text-[0.8125rem] font-medium text-ink">{point.topic}</span>
                    <ChevronDown className="size-4 shrink-0 text-ink-faint transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="border-t border-line px-4 pb-4 pt-3">
                    <p className="text-xs leading-relaxed text-ink-soft">{point.summary}</p>
                    {point.proposals.length ? (
                      <div className="mt-3">
                        <p className="font-mono text-[0.58rem] uppercase tracking-wider text-ink-faint">Proposals</p>
                        <ul className="mt-1.5 space-y-1">
                          {point.proposals.map((proposal) => (
                            <li key={proposal} className="text-xs leading-relaxed text-ink-soft">— {proposal}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {point.concerns.length ? (
                      <div className="mt-3">
                        <p className="font-mono text-[0.58rem] uppercase tracking-wider text-ink-faint">Concerns</p>
                        <ul className="mt-1.5 space-y-1">
                          {point.concerns.map((concern) => (
                            <li key={concern} className="text-xs leading-relaxed text-ink-soft">— {concern}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <EvidenceList evidence={point.evidence} onJump={onJump} />
                  </div>
                </details>
              ))
            ) : (
              <p className="text-xs text-ink-faint">No discussion points were extracted.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <Quote className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-tight">Speaker contributions</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.speakerContributions.length ? (
              report.speakerContributions.map((contribution) => (
                <div key={contribution.speakerId} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink">{contribution.speakerName}</p>
                    <Badge tone="muted" className="font-mono">{contribution.speakerId}</Badge>
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {contribution.points.map((point) => (
                      <li key={point} className="text-[0.7rem] leading-relaxed text-ink-soft">• {point}</li>
                    ))}
                  </ul>
                  <EvidenceList evidence={contribution.evidence} onJump={onJump} />
                </div>
              ))
            ) : (
              <p className="text-xs text-ink-faint">No speaker contributions were extracted.</p>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-clay" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-tight">Open questions</h2>
            <Badge tone="warning">{report.openQuestions.length}</Badge>
          </div>
          <div className="mt-4 space-y-4">
            {report.openQuestions.length ? (
              report.openQuestions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="border-l-2 border-clay/30 pl-3">
                  <p className="text-xs font-medium leading-relaxed text-ink">{question.question}</p>
                  {question.context ? (
                    <p className="mt-1 text-[0.7rem] leading-relaxed text-ink-faint">{question.context}</p>
                  ) : null}
                  <EvidenceList evidence={question.evidence} onJump={onJump} />
                </div>
              ))
            ) : (
              <p className="text-xs text-ink-faint">No open questions were recorded.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold tracking-tight">Next meeting</h2>
          {report.nextMeeting.proposedDate || report.nextMeeting.agenda.length ? (
            <div className="mt-3">
              {report.nextMeeting.proposedDate ? (
                <p className="text-xs text-ink-soft">
                  <span className="font-medium text-ink">Proposed:</span>{" "}
                  {report.nextMeeting.proposedDate}
                </p>
              ) : (
                <p className="text-xs text-ink-faint">No date was agreed.</p>
              )}
              {report.nextMeeting.agenda.length ? (
                <ul className="mt-3 space-y-1.5">
                  {report.nextMeeting.agenda.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-faint">
              No next meeting date or agenda was supported by the transcript.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-paper-deep/50 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-tight">Report provenance</h2>
            <Badge tone="neutral">v{report.version}</Badge>
          </div>
          <dl className="mt-3 space-y-2 text-[0.7rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Model</dt>
              <dd className="text-right font-mono text-ink-soft">{report.model ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Generated</dt>
              <dd className="text-right text-ink-soft">{new Date(report.generatedAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Transcript</dt>
              <dd className="text-right text-ink-soft">
                {meeting.transcriptMeta
                  ? `${meeting.transcriptMeta.provider} · ${meeting.transcriptMeta.diarized ? "speaker labels" : "no diarization"}`
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-[0.65rem] leading-relaxed text-ink-faint">
            AI output can contain mistakes. Verify important decisions and
            assignments against the transcript.
          </p>
        </section>

        {report.validationWarnings.length ? (
          <details className="rounded-2xl border border-clay/25 bg-clay-soft/60 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-clay">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {report.validationWarnings.length} validation note{report.validationWarnings.length === 1 ? "" : "s"}
              <ChevronDown className="ml-auto size-3.5" aria-hidden="true" />
            </summary>
            <ul className="mt-3 space-y-1.5">
              {report.validationWarnings.map((warning) => (
                <li key={warning} className="text-[0.68rem] leading-relaxed text-clay/90">• {warning}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
