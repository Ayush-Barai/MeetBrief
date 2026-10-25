import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-[0.8125rem] font-medium text-ink", className)}
      {...props}
    />
  );
}

export function Hint({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("mt-1.5 text-xs leading-relaxed text-ink-faint", className)} {...props} />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint/80 transition-colors hover:border-ink/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint/80 transition-colors hover:border-ink/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-line-strong bg-white px-3.5 pr-9 text-sm text-ink transition-colors hover:border-ink/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
