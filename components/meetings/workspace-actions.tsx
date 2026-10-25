"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clipboard,
  Download,
  Link2,
  Loader2,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { MeetingDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";

export function WorkspaceActions({
  meeting,
  readOnly,
  downloadHref,
}: {
  meeting: MeetingDetail;
  readOnly?: boolean;
  downloadHref?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(meeting.shareEnabled);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShareOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shareOpen]);

  const summaryText = () => {
    const report = meeting.report;
    if (!report) return meeting.title;
    const lines = [
      `${meeting.title} — meeting summary`,
      "",
      report.executiveSummary.purpose,
      "",
      "Key outcomes:",
      ...report.executiveSummary.keyOutcomes.map((item) => `- ${item}`),
      "",
      "Action items:",
      ...meeting.actionItems.map(
        (item) =>
          `- ${item.task} — ${item.owner} (${item.deadline}) [${item.status.replace("_", " ")}]`,
      ),
    ];
    if (report.openQuestions.length) {
      lines.push("", "Open questions:");
      for (const question of report.openQuestions) lines.push(`- ${question.question}`);
    }
    return lines.join("\n");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      window.alert("Could not copy. Select the summary text manually.");
    }
  };

  const toggleShare = async (enabled: boolean) => {
    setShareBusy(true);
    setShareError(null);
    try {
      const result = await apiFetch<{ enabled: boolean; url: string | null }>(
        `/api/meetings/${meeting.id}/share`,
        { method: "POST", body: JSON.stringify({ enabled }) },
      );
      setShareEnabled(result.enabled);
      setShareUrl(result.url);
      if (!result.enabled) setShareUrl(null);
      router.refresh();
    } catch (error) {
      setShareError((error as Error).message);
    } finally {
      setShareBusy(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setShareError("Could not copy the link. Select it manually.");
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        "Delete this meeting and all associated audio, transcript, report, and action items? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      window.alert((error as Error).message);
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Clipboard className="size-3.5" aria-hidden="true" />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy summary"}</span>
        </Button>
        <a
          href={downloadHref ?? `/api/meetings/${meeting.id}/export`}
          className="inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Download className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Markdown</span>
        </a>
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Print</span>
        </Button>
        {!readOnly ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-3.5" aria-hidden="true" />
              Share
            </Button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="grid size-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-[#fbeeec] hover:text-danger disabled:opacity-50"
              aria-label="Delete meeting"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          </>
        ) : null}
      </div>

      {shareOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShareOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-t-2xl border border-line bg-white p-6 shadow-lift sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="share-title" className="display text-2xl">Share this report</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                  Anyone with the secret link can read this report and its audio
                  recap. Search engines are excluded. Revoke access at any time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-paper"
                aria-label="Close share dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-line bg-paper p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className={`size-2 rounded-full ${shareEnabled ? "bg-accent" : "bg-ink-faint/40"}`} />
                <span className="font-medium">{shareEnabled ? "Sharing is on" : "Sharing is off"}</span>
              </div>
              {shareUrl ? (
                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 py-2 font-mono text-[0.65rem] text-ink-soft"
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="Share link"
                  />
                  <Button size="sm" onClick={copyShare}>
                    {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-[0.7rem] leading-relaxed text-ink-faint">
                  {shareEnabled
                    ? "The previous link is still active. Create a new link to get a URL, which invalidates the old one."
                    : "Create an unguessable link for people who should see this meeting."}
                </p>
              )}
            </div>

            {shareError ? <p className="mt-3 text-xs text-danger">{shareError}</p> : null}

            <div className="mt-5 flex flex-col gap-2">
              {!shareEnabled ? (
                <Button onClick={() => toggleShare(true)} disabled={shareBusy}>
                  {shareBusy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                  Create secure share link
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Create a new link? The old share link will stop working immediately.",
                        )
                      ) {
                        toggleShare(true);
                      }
                    }}
                    disabled={shareBusy}
                  >
                    {shareBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshIcon />}
                    Create new link
                  </Button>
                  <Button variant="danger" onClick={() => toggleShare(false)} disabled={shareBusy}>
                    Turn off sharing
                  </Button>
                </>
              )}
            </div>
            <p className="mt-4 text-[0.65rem] leading-relaxed text-ink-faint">
              Share links are not indexed and do not appear in searches. Anyone
              with the URL has access, so treat it like a private document.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
