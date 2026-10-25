"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatus({ className }: { className?: string }) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online === null) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-faint", className)}>
        <span className="size-1.5 rounded-full bg-ink-faint/50" aria-hidden />
        <span>Checking connection</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        online ? "text-ink-faint" : "text-clay",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {online ? (
        <Wifi className="size-3.5" aria-hidden="true" />
      ) : (
        <WifiOff className="size-3.5" aria-hidden="true" />
      )}
      <span>{online ? "Online" : "Offline · uploads paused"}</span>
    </span>
  );
}
