"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Avoid logging user content; only the digest and generic event.
    console.error("[meetbrief:client]", { digest: error.digest });
  }, [error.digest]);

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-line bg-white text-danger shadow-soft">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Something went wrong</p>
        <h1 className="display mt-2 text-3xl leading-tight">The page hit an unexpected error.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Your meeting data has not been changed by this error. Try again, or go
          back to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className={buttonStyles("primary", "md")}>
            Try again
          </button>
          <Link href="/dashboard" className={buttonStyles("secondary", "md")}>
            Dashboard
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 font-mono text-[0.65rem] text-ink-faint">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
