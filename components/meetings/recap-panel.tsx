"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AudioLines,
  Check,
  Clipboard,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { MeetingDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/meetings/audio-player";
import { apiFetch } from "@/lib/client-api";

export function RecapPanel({
  meeting,
  readOnly,
  sharedAudioSrc,
}: {
  meeting: MeetingDetail;
  readOnly?: boolean;
  sharedAudioSrc?: string;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const recap = meeting.recap;
  const isDemo = Boolean(meeting.isDemo);
  const audioSrc =
    sharedAudioSrc ?? `/api/meetings/${meeting.id}/recap/audio`;
  const ready = recap.status === "ready";

  const generate = async (regenerate = false) => {
    if (regenerate && !window.confirm("Regenerate the audio recap from the latest report? This calls ElevenLabs again.")) {
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      await apiFetch(`/api/meetings/${meeting.id}/recap`, { method: "POST" });
      router.refresh();
    } catch (generateError) {
      setError((generateError as Error).message);
      router.refresh();
    } finally {
      setGenerating(false);
    }
  };

  const copyScript = async () => {
    if (!recap.script) return;
    try {
      await navigator.clipboard.writeText(recap.script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setError("Could not copy the script. Select the text manually.");
    }
  };

  if (isDemo) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <AudioLines className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
          <h2 className="display text-2xl">Audio recap</h2>
          <Badge tone="warning">Demo</Badge>
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="flex items-center gap-4 rounded-xl bg-paper p-5">
            <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
              <AudioLines className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Spoken recap after processing</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                In a real meeting, this section narrates the purpose, takeaways,
                decisions, tasks, and open questions using ElevenLabs. This demo
                does not include fabricated audio.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["1. Purpose", "Confirm launch readiness and resolve pricing, onboarding, and support decisions."],
              ["2. Takeaways", "Launch stays on September 30; the trial shortens to 14 days pending legal."],
              ["3. Decisions", "Scope freeze confirmed. 14-day trial is tentative. Existing trials keep 30 days."],
              ["4. Action items", "Daniel sends copy to legal; Priya finishes mobile Safari QA."],
              ["5. Open questions", "Legal approval timing and weekend contractor availability."],
            ].map(([label, text]) => (
              <div key={label} className="rounded-xl border border-line p-4">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-faint">{label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[0.68rem] leading-relaxed text-ink-faint">
            Demo scripting only. No audio is generated and no ElevenLabs request is made.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AudioLines className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="display text-2xl">Audio recap</h2>
            {recap.status === "stale" ? <Badge tone="warning">Needs refresh</Badge> : null}
            {ready ? <Badge tone="accent"><Check className="size-2.5" /> Ready</Badge> : null}
          </div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-faint">
            A concise spoken briefing generated with ElevenLabs. It summarizes
            the report, it does not read the transcript aloud.
          </p>
        </div>
        {!readOnly && recap.script ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => generate(true)}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden="true" />
            )}
            {ready ? "Regenerate" : "Generate audio"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-danger/20 bg-[#fbeeec] p-4 text-xs leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Audio generation failed</p>
            <p className="mt-1">{error}</p>
            {recap.error && recap.error !== error ? (
              <p className="mt-1 opacity-70">Provider: {recap.error}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {recap.status === "failed" && !error ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-danger/20 bg-[#fbeeec] p-4 text-xs leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">The last audio generation did not finish</p>
            <p className="mt-1">{recap.error ?? "Try generating again."} The recap script below is still available.</p>
          </div>
        </div>
      ) : null}

      {ready ? (
        <AudioPlayer
          className="mt-5"
          src={audioSrc}
          title={`${meeting.title} — audio recap`}
          subtitle={`ElevenLabs${recap.generatedAt ? ` · ${new Date(recap.generatedAt).toLocaleDateString()}` : ""}`}
          downloadName={`${meeting.title.replace(/[^a-zA-Z0-9._-]+/g, "-")}-recap.mp3`}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-white/70 p-6">
          <div className="flex flex-col items-center py-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium text-ink">
              {recap.script
                ? "The script is ready. Generate the audio when you are."
                : "No audio recap yet"}
            </p>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-ink-faint">
              {readOnly
                ? "The owner of this report has not generated an audio recap."
                : "We build a short script from the current report, then ask ElevenLabs to narrate it. This usually takes 10–30 seconds."}
            </p>
            {!readOnly ? (
              <Button className="mt-5" onClick={() => generate(false)} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Generating audio…
                  </>
                ) : (
                  <>
                    <AudioLines className="size-4" aria-hidden="true" />
                    {recap.script ? "Generate audio" : "Create audio recap"}
                  </>
                )}
              </Button>
            ) : null}
            {generating ? (
              <p className="mt-3 text-[0.65rem] text-ink-faint">
                Keep this tab open while ElevenLabs renders the audio.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {recap.script ? (
        <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Recap script</h3>
              <p className="mt-0.5 text-[0.65rem] text-ink-faint">
                Regenerate after editing the report so the audio matches your changes.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={copyScript}>
              {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Clipboard className="size-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="prose-report mt-4 max-w-none text-sm leading-relaxed text-ink-soft">
            {recap.script.split("\n\n").map((paragraph, index) => (
              <p key={index} className="mb-3 last:mb-0">{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {readOnly && !ready ? (
        <p className="mt-4 text-center text-[0.68rem] text-ink-faint">
          This shared report has no audio recap.
        </p>
      ) : null}
    </div>
  );
}
