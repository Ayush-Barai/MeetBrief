import Link from "next/link";
import type { Metadata } from "next";
import { Download, MonitorSmartphone, Share, Smartphone } from "lucide-react";
import { InstallButton } from "@/components/install-button";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Install the app",
  description: "Install MeetBrief AI as a Progressive Web App on Android, iOS, or desktop.",
};

export default function InstallPage() {
  return (
    <div className="container-page py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Progressive Web App</p>
        <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl">
          Keep MeetBrief one tap away.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          MeetBrief installs like a native app on supported phones and desktop
          browsers. It opens in its own window, remembers your session, and
          offers an offline fallback. Your meetings still live on the server.
        </p>

        <div className="mt-6">
          <InstallButton />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <Smartphone className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">Android / Chrome</h2>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
              <li>1. Open MeetBrief in Chrome.</li>
              <li>2. Tap the three-dot menu.</li>
              <li>3. Choose “Install app” or “Add to Home screen”.</li>
              <li>4. Confirm the install.</li>
            </ol>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <Share className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">iPhone / Safari</h2>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
              <li>1. Open MeetBrief in Safari.</li>
              <li>2. Tap the Share button.</li>
              <li>3. Choose “Add to Home Screen”.</li>
              <li>4. Confirm with Add.</li>
            </ol>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <MonitorSmartphone className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">Desktop</h2>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
              <li>1. Look for the install icon in the address bar.</li>
              <li>2. Or use the browser menu.</li>
              <li>3. Choose Install MeetBrief.</li>
              <li>4. Launch it from your apps.</li>
            </ol>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-paper-deep/50 p-5 md:p-6">
          <h2 className="text-sm font-semibold">What works offline?</h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            The app shell and an offline fallback page are cached. That is
            deliberately limited: meeting recordings, transcripts, reports,
            share pages, and API responses are not cached by the service worker.
            Recording, uploading, transcription, AI analysis, audio generation,
            and report synchronization all require an internet connection.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Installing the app does not guarantee reliable background recording
            or unrestricted background processing on every phone. For long or
            important meetings, use a dedicated recorder and upload the file when
            you are back online.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink href="/dashboard">
            <Download className="size-4" aria-hidden="true" />
            Go to dashboard
          </ButtonLink>
          <Link
            href="/privacy"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            Privacy & consent
          </Link>
        </div>
      </div>
    </div>
  );
}
