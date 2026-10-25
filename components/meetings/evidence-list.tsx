"use client";

import { Quote } from "lucide-react";
import type { EvidenceRef } from "@/types";
import { formatTimestamp } from "@/lib/utils";

export function EvidenceList({
  evidence,
  onJump,
}: {
  evidence: EvidenceRef[];
  onJump?: (segmentId: string) => void;
}) {
  if (!evidence.length) {
    return (
      <p className="mt-2 text-[0.68rem] italic text-ink-faint">
        No transcript evidence attached. Verify manually.
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {evidence.map((item) => (
        <li key={`${item.segmentId}-${item.timestampSeconds}`}>
          <button
            type="button"
            onClick={() => onJump?.(item.segmentId)}
            className="group flex w-full items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-paper"
          >
            <Quote className="mt-0.5 size-3 shrink-0 text-ink-faint" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-mono text-[0.62rem] text-accent group-hover:underline">
                {formatTimestamp(item.timestampSeconds)}
              </span>
              <span className="ml-1.5 text-[0.7rem] leading-relaxed text-ink-faint">
                “{item.quote}”
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
