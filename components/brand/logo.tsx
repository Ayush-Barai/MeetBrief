import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="MeetBrief AI home"
    >
      <span className="relative grid size-8 place-items-center rounded-[0.6rem] bg-ink text-paper transition-transform duration-300 group-hover:-rotate-3">
        <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true" fill="none">
          <path
            d="M5 6.5h9.5M5 10.5h6.5M5 14.5h8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M14.5 16.5l2 2 4-4.5"
            stroke="#8fd6bf"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-[1.0625rem] font-semibold tracking-[-0.03em]">
          MeetBrief<span className="text-accent"> AI</span>
        </span>
      ) : null}
    </Link>
  );
}
