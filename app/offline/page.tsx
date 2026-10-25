import Link from "next/link";
import { WifiOff } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export const metadata = { title: "You are offline" };

export default function OfflinePage() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-line bg-white text-clay shadow-soft">
          <WifiOff className="size-6" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Offline</p>
        <h1 className="display mt-2 text-3xl leading-tight">You&apos;re not connected.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          MeetBrief needs connectivity to record, upload, transcribe, analyze,
          and sync reports. Reconnect to the internet and try again.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={buttonStyles("primary", "md")}>
            Retry dashboard
          </Link>
          <Link href="/" className={buttonStyles("secondary", "md")}>
            Back to home
          </Link>
        </div>
        <p className="mt-5 text-[0.68rem] leading-relaxed text-ink-faint">
          Private reports are never cached for offline reading by the service
          worker.
        </p>
      </div>
    </div>
  );
}
