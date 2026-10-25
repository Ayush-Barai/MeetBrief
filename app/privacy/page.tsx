import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy & consent",
  description:
    "How MeetBrief AI handles meeting recordings, transcripts, AI processing, storage, sharing, and deletion.",
};

export default function PrivacyPage() {
  return (
    <div className="container-page py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Privacy & consent</p>
        <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">
          A careful record starts with consent.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          MeetBrief is built for meetings where people know they are being
          recorded and understand how the record will be used. You are
          responsible for obtaining any consent required in your jurisdiction.
        </p>

        <div className="mt-8 space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Consent before capture</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              You must confirm participant consent before recording or uploading.
              In-browser recording shows a visible microphone-active indicator and
              a running timer. You can pause or stop at any time. The app will not
              start transcription until you explicitly choose “Start analysis”.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
            <h2 className="text-sm font-semibold">What is stored, and where</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-soft">
              <li>• Meeting metadata, transcript segments, reports, and action items are stored in MongoDB Atlas.</li>
              <li>• Audio recordings and generated recaps are stored in MongoDB GridFS, not as base64 inside meeting documents.</li>
              <li>• Audio is sent to your configured transcription provider for processing.</li>
              <li>• Transcript excerpts are sent to your configured Gemma inference endpoint to produce the report.</li>
              <li>• The recap script is sent to ElevenLabs only when you generate audio.</li>
              <li>• Provider credentials remain server-side and are never exposed in the browser.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
            <h2 className="text-sm font-semibold">Ownership and access</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              This MVP uses a signed browser ownership cookie. Meetings are scoped
              to that owner on every server operation; client-side checks are not
              relied on. Share links use unguessable 256-bit tokens, are excluded
              from search indexing, and can be revoked. Anyone with a share URL can
              read the report, so treat it like a private document.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
            <h2 className="text-sm font-semibold">Retention and deletion</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Meetings remain until you delete them. Deleting a meeting removes the
              meeting document, transcript segments, report, action items, original
              audio, and generated recap from MongoDB. Provider-side retention is
              governed by the terms of your transcription, Gemma, and ElevenLabs
              accounts. Configure those providers&apos; data-retention settings according
              to your policy.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft md:p-6">
            <h2 className="text-sm font-semibold">AI is not a legal record</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Transcripts and summaries are machine-generated and can contain
              errors, omissions, or misattributed speech. MeetBrief attaches
              evidence timestamps and removes unsupported owners and deadlines where
              possible, but you should verify important decisions and assignments
              against the transcript. Do not rely on AI output as a perfect legal
              record.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-paper-deep/50 p-5 md:p-6">
            <h2 className="text-sm font-semibold">Service worker limits</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              The PWA caches only safe static assets and an offline fallback. It
              does not cache private transcripts, reports, recordings, share pages,
              authentication responses, or sensitive API results. Connectivity is
              required for capture, upload, processing, and synchronization.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink href="/meetings/new">Create a meeting report</ButtonLink>
          <Link
            href="/setup"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            Integration setup
          </Link>
        </div>
      </div>
    </div>
  );
}
