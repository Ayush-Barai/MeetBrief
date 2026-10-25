import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import type {
  ActionPriority,
  ActionStatus,
  DecisionStatus,
  MeetingStatus,
} from "@/types";

type Tone = "neutral" | "accent" | "warning" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong bg-white text-ink-soft",
  accent: "border-accent/15 bg-accent-soft text-accent-deep",
  warning: "border-clay/20 bg-clay-soft text-clay",
  danger: "border-danger/20 bg-[#fbeeec] text-danger",
  muted: "border-transparent bg-paper-deep text-ink-faint",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: MeetingStatus }) {
  if (status === "completed") return <Badge tone="accent">Ready</Badge>;
  if (status === "processing") return <Badge tone="warning">Processing</Badge>;
  if (status === "failed") return <Badge tone="danger">Needs attention</Badge>;
  return <Badge tone="neutral">Uploaded</Badge>;
}

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  if (status === "completed") return <Badge tone="accent">Completed</Badge>;
  if (status === "in_progress") return <Badge tone="warning">In progress</Badge>;
  return <Badge tone="neutral">Pending</Badge>;
}

export function PriorityBadge({ priority }: { priority: ActionPriority }) {
  if (priority === "high") return <Badge tone="danger">High</Badge>;
  if (priority === "medium") return <Badge tone="warning">Medium</Badge>;
  if (priority === "low") return <Badge tone="neutral">Low</Badge>;
  return <Badge tone="muted">Unspecified</Badge>;
}

export function DecisionBadge({ status }: { status: DecisionStatus }) {
  return status === "confirmed" ? (
    <Badge tone="accent">Confirmed</Badge>
  ) : (
    <Badge tone="warning">Tentative</Badge>
  );
}
