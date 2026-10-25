import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireSessionUserId } from "@/lib/auth/session";
import { getIntegrationStatus, config } from "@/lib/config";
import { NewMeetingForm } from "@/components/meetings/new-meeting-form";

export const metadata: Metadata = {
  title: "New meeting report",
  description: "Record or upload a meeting to create a structured MeetBrief report.",
};

export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  await requireSessionUserId();
  const integrations = getIntegrationStatus();
  const ready =
    integrations.database.configured &&
    integrations.transcription.configured &&
    integrations.gemma.configured;

  return (
    <div className="container-page py-8 md:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Dashboard
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">New meeting</p>
          <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">
            Create a meeting report
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Add a recording now. Review it before starting transcription and AI
            analysis on the next screen.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[0.68rem] text-ink-faint">
          <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
          Consent required
        </div>
      </div>

      {!ready ? (
        <div className="mt-6 rounded-xl border border-clay/25 bg-clay-soft/60 px-4 py-3 text-xs leading-relaxed text-clay">
          <span className="font-medium">Some integrations are not configured.</span>{" "}
          You can still upload a recording, but processing will not start until
          transcription and Gemma are set up.{" "}
          <Link href="/setup" className="underline">
            View setup status
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-8">
        <NewMeetingForm maxUploadMb={Math.round(config.maxUploadBytes / (1024 * 1024))} />
      </div>
    </div>
  );
}
