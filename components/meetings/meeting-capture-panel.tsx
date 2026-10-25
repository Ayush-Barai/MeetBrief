"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileAudio,
  Loader2,
  Play,
  RefreshCw,
  Settings2,
  Square,
  UsersRound,
} from "lucide-react";
import type { Meeting, ProcessingStage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/meetings/audio-player";
import { apiFetch } from "@/lib/client-api";
import { cn, formatBytes, formatDuration, formatDate, languageLabel } from "@/lib/utils";

const stageInfo: Array<{ id: ProcessingStage; label: string; detail: string }> = [
  { id: "transcribing", label: "Transcribing", detail: "Timestamps and speaker labels" },
  { id: "analyzing", label: "Analyzing", detail: "Gemma builds the structured report" },
  { id: "saving", label: "Saving", detail: "Validating evidence and action items" },
];

function stageIndex(stage: ProcessingStage): number {
  const index = stageInfo.findIndex((item) => item.id === stage);
  if (stage === "generating_recap" || stage === "done") return stageInfo.length;
  return index;
}

export function MeetingCapturePanel({ meeting }: { meeting: Meeting }) {
  const router = useRouter();
  const [status, setStatus] = useState(meeting.status);
  const [stage, setStage] = useState<ProcessingStage>(meeting.processingStage);
  const [error, setError] = useState<string | null>(meeting.errorMessage);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "processing") return;
    const poll = async () => {
      try {
        const result = await apiFetch<{
          status: Meeting["status"];
          processingStage: ProcessingStage;
          errorMessage: string | null;
        }>(`/api/meetings/${meeting.id}/status`);
        setStage(result.processingStage);
        setStatus(result.status);
        setError(result.errorMessage);
        if (result.status === "completed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          router.refresh();
        } else if (result.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      } catch {
        // Keep polling; transient network failures are expected.
      }
    };
    void poll();
    pollRef.current = window.setInterval(poll, 3_000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [status, meeting.id, router]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/meetings/${meeting.id}/process`, { method: "POST" });
      setStatus("processing");
      setStage("queued");
      router.refresh();
    } catch (startError) {
      setError((startError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel processing? The current transcription or analysis may still finish in the background.")) {
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/meetings/${meeting.id}/process`, { method: "DELETE" });
      setStatus("failed");
      setError("Processing was cancelled. You can retry when you are ready.");
      router.refresh();
    } catch (cancelError) {
      setError((cancelError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const processing = status === "processing";
  const currentIndex = stageIndex(stage);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileAudio className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
              <h2 className="text-sm font-semibold">Recording</h2>
            </div>
            <Badge tone={processing ? "warning" : status === "failed" ? "danger" : "neutral"}>
              {processing ? "Processing" : status === "failed" ? "Needs attention" : "Ready to analyze"}
            </Badge>
          </div>
          <div className="mt-4">
            {meeting.audio ? (
              <AudioPlayer
                src={`/api/meetings/${meeting.id}/audio`}
                title={meeting.audio.filename}
                subtitle={`${formatBytes(meeting.audio.sizeBytes)} · ${formatDuration(meeting.durationSeconds)}`}
              />
            ) : (
              <p className="text-xs text-ink-faint">No audio file is stored for this meeting.</p>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-ink-faint">Language</dt>
              <dd className="mt-1 font-medium">{languageLabel(meeting.language)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Duration</dt>
              <dd className="mt-1 font-medium">{formatDuration(meeting.durationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Created</dt>
              <dd className="mt-1 font-medium">{formatDate(meeting.createdAt)}</dd>
            </div>
          </dl>
          {meeting.participantNames.length ? (
            <div className="mt-4 flex items-start gap-2 border-t border-line pt-4">
              <UsersRound className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-ink-faint">Participants</p>
                <p className="mt-1 text-xs text-ink-soft">{meeting.participantNames.join(", ")}</p>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-[#fbeeec] p-4 text-xs leading-relaxed text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">{processing ? "Processing error" : "This meeting needs attention"}</p>
              <p className="mt-1">{error}</p>
              <Link href="/setup" className="mt-2 inline-flex items-center gap-1 font-medium underline">
                <Settings2 className="size-3" aria-hidden="true" /> Check integration setup
              </Link>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          {processing ? (
            <>
              <h2 className="text-sm font-semibold">Building your meeting record</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                You can leave this tab open. We check the processing status every
                few seconds. This usually takes 1–4 minutes depending on recording length.
              </p>
              <ol className="mt-5 space-y-4">
                {stageInfo.map((item, index) => {
                  const active = currentIndex === index;
                  const complete = currentIndex > index;
                  return (
                    <li key={item.id} className="flex gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[0.65rem]",
                          complete
                            ? "border-accent bg-accent text-white"
                            : active
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line-strong bg-white text-ink-faint",
                        )}
                      >
                        {complete ? (
                          <Check className="size-3" aria-hidden="true" />
                        ) : active ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div>
                        <p className={cn("text-xs font-medium", active || complete ? "text-ink" : "text-ink-faint")}>
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] text-ink-faint">{item.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button variant="danger" size="sm" onClick={cancel} disabled={busy}>
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3" />}
                  Cancel processing
                </Button>
                <span className="text-[0.65rem] text-ink-faint">
                  Cancellation stops the workflow before the next stage.
                </span>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold">
                {status === "failed" ? "Try again" : "Ready when you are"}
              </h2>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-ink-faint">
                {status === "failed"
                  ? "Retry the transcription and report generation. No new audio is uploaded."
                  : "Review the recording, then start transcription and AI analysis. We will not start until you choose to."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={start} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : status === "failed" ? (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  ) : (
                    <Play className="size-4" aria-hidden="true" />
                  )}
                  {status === "failed" ? "Retry processing" : "Start analysis"}
                </Button>
                <Link
                  href="/meetings/new"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white px-5 text-sm font-medium text-ink transition-colors hover:border-ink/30"
                >
                  Upload another
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-4 text-[0.65rem] leading-relaxed text-ink-faint">
                Processing sends the recording to your configured transcription
                provider and transcript excerpts to your configured Gemma endpoint.
                Audio is not logged or exposed publicly.
              </p>
            </>
          )}
        </div>
      </div>

      <aside className="h-fit space-y-4">
        <div className="rounded-2xl border border-line bg-paper-deep/50 p-5">
          <h3 className="text-xs font-semibold">What happens next</h3>
          <ul className="mt-3 space-y-3">
            {[
              "A timestamped transcript is created; speakers get anonymous labels when diarization is available.",
              "Gemma writes a structured report with evidence links back to the transcript.",
              "Owners and deadlines that are not explicit in the recording are removed during validation.",
              "You can edit the report, map speakers, update tasks, and generate an ElevenLabs recap.",
            ].map((line) => (
              <li key={line} className="flex gap-2 text-[0.7rem] leading-relaxed text-ink-soft">
                <Check className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-clay/20 bg-clay-soft/50 p-4 text-[0.68rem] leading-relaxed text-clay">
          <p className="font-medium">Hosting limitation</p>
          <p className="mt-1">
            Processing runs asynchronously on the Render web service. If the
            service restarts mid-job, the meeting is marked failed and can be
            retried. Long recordings may hit provider limits.
          </p>
        </div>
      </aside>
    </div>
  );
}
