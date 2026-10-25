"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileAudio,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { LANGUAGES } from "@/types";
import { ACCEPTED_AUDIO } from "@/lib/upload";
import { cn, formatBytes, formatTimestamp } from "@/lib/utils";

type SourceMode = "upload" | "record";
type RecordState = "idle" | "recording" | "paused" | "stopped";

interface AudioSelection {
  file: File;
  durationSeconds: number | null;
  source: SourceMode;
}

function PreviewAudio({ file, className }: { file: File; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return null;
  return <audio controls src={src} className={className} />;
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 10_000);
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    audio.src = url;
  });
}

export function NewMeetingForm({ maxUploadMb }: { maxUploadMb: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantDraft, setParticipantDraft] = useState("");
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState<SourceMode>("upload");
  const [consent, setConsent] = useState(false);
  const [selection, setSelection] = useState<AudioSelection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const shouldStopRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    if (recordState === "recording") {
      timerRef.current = window.setInterval(() => {
        const current = accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000;
        setElapsed(current);
      }, 250);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [recordState]);

  useEffect(() => {
    const stopTracks = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    return stopTracks;
  }, []);

  useEffect(() => {
    if (recordState !== "recording" && recordState !== "paused") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [recordState]);

  const addParticipant = (raw: string) => {
    const value = raw.trim().replace(/,$/, "");
    if (!value) return;
    if (participants.length >= 30) return;
    if (participants.some((name) => name.toLowerCase() === value.toLowerCase())) {
      setParticipantDraft("");
      return;
    }
    setParticipants([...participants, value]);
    setParticipantDraft("");
  };

  const handleFile = async (file: File | null | undefined) => {
    setError(null);
    setSelection(null);
    if (!file) return;
    if (file.size > maxUploadMb * 1024 * 1024) {
      setError(`This file is ${formatBytes(file.size)}. The limit is ${maxUploadMb} MB.`);
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["mp3", "wav", "m4a", "mp4", "webm", "ogg", "oga", "aac", "flac", "mpga"];
    if (!allowed.includes(extension)) {
      setError("Unsupported format. Use MP3, WAV, M4A, WebM, OGG, AAC, FLAC, or MP4.");
      return;
    }
    if (file.size === 0) {
      setError("That file appears to be empty.");
      return;
    }
    const durationSeconds = await readAudioDuration(file);
    setSelection({ file, durationSeconds, source: "upload" });
  };

  const startRecording = async () => {
    setMicError(null);
    setError(null);
    if (!consent) {
      setMicError("Confirm participant consent before turning on the microphone.");
      return;
    }
    const mimeType = pickMimeType();
    if (mimeType === null) {
      setMicError("This browser does not support in-browser recording. Upload an audio file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      accumulatedRef.current = 0;
      startedAtRef.current = Date.now();
      shouldStopRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setMicError("Recording stopped unexpectedly. Keep this page open and try again.");
        stream.getTracks().forEach((track) => track.stop());
      };
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (recorder.state !== "inactive") {
            shouldStopRef.current = true;
            recorder.stop();
          }
        };
      });
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const finalElapsed =
          accumulatedRef.current +
          (recorder.state === "inactive" ? 0 : (Date.now() - startedAtRef.current) / 1000);
        const extension = mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
        const type = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size === 0) {
          setMicError("No audio was captured. Check your microphone and try again.");
          setRecordState("idle");
          return;
        }
        const file = new File([blob], `meetbrief-recording.${extension}`, { type });
        const duration = await readAudioDuration(file);
        setSelection({
          file,
          durationSeconds: duration ?? (finalElapsed || elapsed || null),
          source: "record",
        });
        setRecordState("stopped");
        setElapsed(finalElapsed);
      };

      recorder.start(1_000);
      setRecordState("recording");
      setElapsed(0);
      setSelection(null);
    } catch (recordError) {
      const name = (recordError as DOMException).name;
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone permission was denied. Allow microphone access in your browser settings, or upload a recording instead."
          : name === "NotFoundError" || name === "DevicesNotFoundError"
            ? "No microphone was found. Connect a microphone or upload a recording."
            : name === "NotReadableError"
              ? "The microphone is busy in another application. Close it and try again."
              : "Could not start recording. Check browser permissions and try again.";
      setMicError(message);
      setRecordState("idle");
    }
  };

  const pauseRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    setRecordState("paused");
  };

  const resumeRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    startedAtRef.current = Date.now();
    recorder.resume();
    setRecordState("recording");
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recorder.state === "recording") {
      accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    }
    shouldStopRef.current = true;
    recorder.stop();
  };

  const resetRecording = () => {
    setSelection(null);
    setRecordState("idle");
    setElapsed(0);
    accumulatedRef.current = 0;
    setMicError(null);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim() || title.trim().length < 2) {
      setError("Add a meeting title before continuing.");
      return;
    }
    if (!selection) {
      setError(mode === "upload" ? "Choose an audio file first." : "Record a meeting first.");
      return;
    }
    if (!consent) {
      setError("Confirm participant consent before uploading or recording.");
      return;
    }
    if (!navigator.onLine) {
      setError("You are offline. Uploading and processing require an internet connection.");
      return;
    }

    const form = new FormData();
    form.append("audio", selection.file);
    form.append("title", title.trim());
    form.append("participantNames", JSON.stringify(participants));
    form.append("language", language);
    form.append("consent", "true");
    if (selection.durationSeconds && Number.isFinite(selection.durationSeconds)) {
      form.append("durationSeconds", String(Math.round(selection.durationSeconds)));
    }

    setSubmitting(true);
    setProgress(0);
    try {
      const result = await new Promise<{ id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/meetings");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const payload = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(payload.meeting);
            } else {
              reject(new Error(payload.error ?? "Upload failed."));
            }
          } catch {
            reject(new Error("The server returned an unexpected response."));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed because of a network error. Check your connection and try again."));
        xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller file or a better connection."));
        xhr.send(form);
      });
      router.push(`/meetings/${result.id}`);
    } catch (submitError) {
      setError((submitError as Error).message);
      setSubmitting(false);
      setProgress(0);
    }
  };

  const activeRecording = recordState === "recording" || recordState === "paused";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.65rem] text-ink-faint">01</span>
            <h2 className="text-sm font-semibold">Meeting details</h2>
          </div>
          <div className="mt-5 space-y-5">
            <div>
              <Label htmlFor="meeting-title">Meeting title</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Q3 launch readiness"
                maxLength={160}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                A specific title makes reports easier to find later.
              </p>
            </div>

            <div>
              <Label htmlFor="participants">Participants <span className="font-normal text-ink-faint">(optional)</span></Label>
              <div className="flex gap-2">
                <Input
                  id="participants"
                  value={participantDraft}
                  onChange={(event) => setParticipantDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addParticipant(participantDraft);
                    }
                  }}
                  onBlur={() => addParticipant(participantDraft)}
                  placeholder="Type a name and press Enter"
                  maxLength={80}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addParticipant(participantDraft)}
                  disabled={!participantDraft.trim()}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
              {participants.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {participants.map((participant) => (
                    <span
                      key={participant}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-2.5 py-1 text-xs text-ink-soft"
                    >
                      {participant}
                      <button
                        type="button"
                        onClick={() => setParticipants(participants.filter((name) => name !== participant))}
                        className="text-ink-faint hover:text-danger"
                        aria-label={`Remove ${participant}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-ink-faint">
                  Used only as context. Names are not inferred from voices.
                </p>
              )}
            </div>

            <div className="max-w-xs">
              <Label htmlFor="language">Meeting language</Label>
              <Select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>
                {LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.65rem] text-ink-faint">02</span>
            <h2 className="text-sm font-semibold">Add the recording</h2>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1" role="tablist" aria-label="Recording source">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "upload"}
              onClick={() => {
                if (activeRecording) return;
                setMode("upload");
                setError(null);
              }}
              disabled={activeRecording}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-50",
                mode === "upload" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink",
              )}
            >
              <Upload className="size-3.5" aria-hidden="true" /> Upload audio
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "record"}
              onClick={() => {
                setMode("record");
                setSelection((current) => (current?.source === "upload" ? null : current));
                setError(null);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors",
                mode === "record" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink",
              )}
            >
              <Mic className="size-3.5" aria-hidden="true" /> Record in browser
            </button>
          </div>

          {mode === "upload" ? (
            <div className="mt-4">
              {!selection || selection.source !== "upload" ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void handleFile(event.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "rounded-xl border border-dashed p-8 text-center transition-colors",
                    dragging ? "border-accent bg-accent-soft/40" : "border-line-strong bg-paper/30",
                  )}
                >
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-accent shadow-soft">
                    <Upload className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-sm font-medium">Drop your recording here</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    MP3, WAV, M4A, WebM, OGG, AAC, FLAC, or MP4 · up to {maxUploadMb} MB
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose a file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_AUDIO}
                    className="sr-only"
                    onChange={(event) => {
                      void handleFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                    aria-label="Choose an audio file"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-accent">
                        <FileAudio className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{selection.file.name}</p>
                        <p className="mt-0.5 text-[0.65rem] text-ink-faint">
                          {formatBytes(selection.file.size)}
                          {selection.durationSeconds ? ` · ${formatTimestamp(selection.durationSeconds)}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelection(null)}
                      className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-white hover:text-ink"
                      aria-label="Remove selected file"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <PreviewAudio file={selection.file} className="mt-3 h-9 w-full" />
                  <p className="mt-2 text-[0.62rem] text-ink-faint">
                    Review the audio before continuing. Nothing is analyzed yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {!supported ? (
                <div className="flex items-start gap-2 rounded-xl bg-clay-soft p-4 text-xs leading-relaxed text-clay">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  In-browser recording is not supported in this browser. Upload an existing audio file instead.
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "rounded-xl border p-5 text-center transition-colors",
                      activeRecording ? "border-danger/30 bg-[#fbeeec]" : "border-line-strong bg-paper/30",
                    )}
                  >
                    {activeRecording ? (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <span className="relative flex size-2.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-40" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
                          </span>
                          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-danger">
                            {recordState === "recording" ? "Microphone active" : "Recording paused"}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-3xl tabular-nums text-ink">{formatTimestamp(elapsed)}</p>
                        <p className="mt-1 text-[0.65rem] text-ink-faint">
                          {recordState === "recording" ? "Recording audio in your browser" : "Microphone is paused"}
                        </p>
                        <div className="mt-4 flex justify-center gap-2">
                          {recordState === "recording" ? (
                            <Button variant="secondary" size="sm" onClick={pauseRecording}>
                              <Pause className="size-3.5" /> Pause
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={resumeRecording}>
                              <Play className="size-3.5" /> Resume
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={stopRecording}>
                            <Square className="size-3" fill="currentColor" /> Stop
                          </Button>
                        </div>
                      </>
                    ) : recordState === "stopped" && selection?.source === "record" ? (
                      <>
                        <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
                          <Check className="size-5" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-medium">Recording captured</p>
                        <p className="mt-0.5 text-[0.65rem] text-ink-faint">
                          {formatTimestamp(selection.durationSeconds ?? elapsed)} · {formatBytes(selection.file.size)}
                        </p>
                        <PreviewAudio file={selection.file} className="mx-auto mt-3 h-9 w-full max-w-md" />
                        <Button variant="ghost" size="sm" className="mt-2" onClick={resetRecording}>
                          <RotateCcw className="size-3.5" /> Record again
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-ink shadow-soft">
                          <Mic className="size-5" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-medium">Record this meeting</p>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-faint">
                          Recording uses your microphone in this tab. If you switch
                          apps or lock your phone, the browser may pause or stop
                          capture. For long meetings, uploading a recording is more reliable.
                        </p>
                        <Button className="mt-4" size="sm" onClick={startRecording} disabled={!consent}>
                          <Mic className="size-3.5" /> Start recording
                        </Button>
                        {!consent ? (
                          <p className="mt-2 text-[0.62rem] text-clay">Confirm consent below before recording.</p>
                        ) : null}
                      </>
                    )}
                  </div>
                  {micError ? (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-clay-soft p-3 text-xs leading-relaxed text-clay">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {micError}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-line-strong"
          />
          <span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
              I have informed all participants and have their consent to record and process this meeting.
            </span>
            <span className="mt-1 block text-[0.68rem] leading-relaxed text-ink-faint">
              Recording laws vary. You are responsible for obtaining consent
              before recording. MeetBrief shows a visible recording indicator and
              processes audio only after you confirm.
            </span>
          </span>
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-[#fbeeec] p-4 text-xs leading-relaxed text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.65rem] leading-relaxed text-ink-faint">
            Your recording is stored privately and processed only after you start analysis.
          </p>
          <Button size="lg" onClick={submit} disabled={submitting || !selection || !consent}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Uploading {progress}%
              </>
            ) : (
              <>
                {mode === "record" ? "Create meeting" : "Upload and continue"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
        {submitting ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>

      <aside className="h-fit space-y-4">
        <div className="rounded-2xl border border-line bg-paper-deep/50 p-5">
          <h3 className="text-xs font-semibold">Before you start</h3>
          <ul className="mt-3 space-y-3">
            {[
              "Place the microphone near the room, not next to a laptop fan.",
              "Ask people to introduce themselves so speaker labels are easier to map.",
              "Uploading an existing recording is the most reliable path, especially for long meetings.",
              "Recording, upload, transcription, and AI analysis all require an internet connection.",
            ].map((line) => (
              <li key={line} className="flex gap-2 text-[0.7rem] leading-relaxed text-ink-soft">
                <Check className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-[0.68rem] leading-relaxed text-ink-faint">
            <span className="font-medium text-ink-soft">What gets processed?</span>{" "}
            The stored recording goes to your transcription provider. Transcript
            excerpts go to your Gemma endpoint. ElevenLabs is called only when you
            generate a recap.
          </p>
        </div>
      </aside>
    </div>
  );
}
