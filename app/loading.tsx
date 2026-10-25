import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="container-page flex min-h-[50vh] items-center justify-center py-20">
      <div className="flex items-center gap-3 text-sm text-ink-faint">
        <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" />
        Loading…
      </div>
    </div>
  );
}
