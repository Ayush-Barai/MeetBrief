import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-line bg-white text-ink-faint shadow-soft">
          <FileQuestion className="size-6" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">404</p>
        <h1 className="display mt-2 text-3xl leading-tight">This page isn&apos;t here.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          The meeting may have been deleted, the link may be invalid, or you may
          not have access to it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={buttonStyles("primary", "md")}>
            Go to dashboard
          </Link>
          <Link href="/demo" className={buttonStyles("secondary", "md")}>
            See the demo
          </Link>
        </div>
      </div>
    </div>
  );
}
