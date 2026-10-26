import Link from "next/link";
import type { Metadata } from "next";
import {
  AudioLines,
  Check,
  Database,
  ExternalLink,
  KeyRound,
  Mic2,
  ServerCog,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { getIntegrationStatus } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Integration setup" };
export const dynamic = "force-dynamic";

const items = [
  {
    key: "database" as const,
    title: "MongoDB Atlas",
    icon: Database,
    env: ["MONGODB_URI", "MONGODB_DB_NAME"],
    body: "Stores meeting metadata, transcript segments, reports, action items, and audio files in GridFS. Create a free Atlas cluster, a database user, and allow Render's outbound IPs (or 0.0.0.0/0 for an MVP).",
  },
  {
    key: "transcription" as const,
    title: "Open-source transcription",
    icon: Mic2,
    env: [
      "TRANSCRIPTION_API_URL",
      "TRANSCRIPTION_API_KEY",
      "TRANSCRIPTION_MODEL",
    ],
    body: "MeetBrief talks to an OpenAI-compatible Whisper endpoint, so you can self-host the model with open-source software such as ScribeCrate (faster-whisper), whisper.cpp, or vLLM. Enable WHISPER_DIARIZATION=true on ScribeCrate for Person 1/Person 2 labels.",
  },
  {
    key: "gemma" as const,
    title: "Gemma inference",
    icon: Sparkles,
    env: ["GEMMA_API_URL", "GEMMA_MODEL", "GEMMA_API_KEY"],
    body: "Point GEMMA_API_URL at an OpenAI-compatible chat completions endpoint serving Gemma, such as Ollama, vLLM, LiteLLM, or a hosted inference provider. The report prompt requires evidence-linked JSON.",
  },
  {
    key: "elevenlabs" as const,
    title: "ElevenLabs",
    icon: AudioLines,
    env: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "ELEVENLABS_MODEL_ID"],
    body: "Generates the optional spoken recap on the server. Find a voice ID in your ElevenLabs workspace. Audio is stored in GridFS and streamed through an authorized route.",
  },
];

export default function SetupPage() {
  const status = getIntegrationStatus();

  return (
    <div className="container-page py-8 md:py-12">
      <div className="max-w-2xl">
        <p className="eyebrow">Setup</p>
        <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">
          Connect the services behind MeetBrief.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          MeetBrief does not fake AI responses. Each integration below must be
          configured with real credentials before its step can run. Missing
          providers are shown as unconfigured, never simulated.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const state = status[item.key];
          return (
            <section key={item.key} className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-paper text-ink">
                  <item.icon className="size-4" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <Badge tone={state.configured ? "accent" : "warning"}>
                  {state.configured ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                  {state.configured ? "Configured" : "Not configured"}
                </Badge>
              </div>
              <h2 className="mt-4 text-sm font-semibold">{item.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{item.body}</p>
              <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[0.68rem] leading-relaxed text-ink-faint">
                {state.detail}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.env.map((name) => (
                  <code key={name} className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-soft">
                    {name}
                  </code>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="text-sm font-semibold">Ownership & sessions</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            MeetBrief uses a signed, HTTP-only browser ownership cookie for this
            MVP. Every meeting query is scoped to the session owner on the
            server. Share links use 256-bit unguessable tokens whose hashes are
            stored in MongoDB and can be revoked.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[0.68rem]">
            <span className={`size-1.5 rounded-full ${status.auth.configured ? "bg-accent" : "bg-clay"}`} />
            {status.auth.detail}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <ServerCog className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="text-sm font-semibold">Render deployment</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Deploy as a Render Web Service. Build with <code className="font-mono">npm ci &amp;&amp; npm run build</code>,
            start with <code className="font-mono">npm run start</code>, and use <code className="font-mono">/api/health</code> as
            the health check. Set all secrets in Render's environment dashboard.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/api/health" variant="secondary" size="sm">
              Health endpoint
              <ExternalLink className="size-3" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/install" variant="ghost" size="sm">
              Install instructions
            </ButtonLink>
          </div>
        </section>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent-soft/60 p-5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <p className="text-xs font-medium text-accent-deep">Secrets stay on the server</p>
          <p className="mt-1 text-[0.7rem] leading-relaxed text-ink-soft">
            Provider keys are read only in server-only modules. They are never
            sent to the browser, embedded in the service worker, or included in
            client bundles. Rotate keys from the provider dashboard if one is
            exposed.
          </p>
        </div>
      </div>

      <p className="mt-6 text-[0.68rem] leading-relaxed text-ink-faint">
        Need the full walkthrough? See <code className="font-mono">README.md</code> in
        the repository for environment variables, Atlas networking, storage
        retention, and troubleshooting. You can also{" "}
        <Link href="/demo" className="text-accent hover:underline">explore the demo</Link>{" "}
        while integrations are being configured.
      </p>
    </div>
  );
}
