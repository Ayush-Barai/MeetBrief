import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NetworkStatus } from "@/components/network-status";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line bg-paper-deep/40">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
              Turn meetings into clear records of what was discussed, decided,
              and assigned.
            </p>
            <div className="mt-5">
              <NetworkStatus />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li><Link className="hover:text-ink" href="/dashboard">Dashboard</Link></li>
              <li><Link className="hover:text-ink" href="/meetings/new">Create a report</Link></li>
              <li><Link className="hover:text-ink" href="/demo">Demo report</Link></li>
              <li><Link className="hover:text-ink" href="/meetings">Meeting history</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Trust</p>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li><Link className="hover:text-ink" href="/privacy">Privacy & consent</Link></li>
              <li><Link className="hover:text-ink" href="/install">Install the app</Link></li>
              <li><Link className="hover:text-ink" href="/setup">Integration setup</Link></li>
              <li>
                <a className="hover:text-ink" href="/api/health" target="_blank" rel="noreferrer">
                  Health status
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MeetBrief AI. Built for careful meetings.</p>
          <p>
            AI output can be imperfect. Verify important decisions against the
            transcript.
          </p>
        </div>
      </div>
    </footer>
  );
}
