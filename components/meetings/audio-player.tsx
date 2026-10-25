"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";

export function AudioPlayer({
  src,
  title,
  subtitle,
  downloadName,
  className,
}: {
  src: string;
  title: string;
  subtitle?: ReactNode;
  downloadName?: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setError(null);
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    if (audio.paused) {
      setLoading(true);
      try {
        await audio.play();
      } catch {
        setError("Playback was blocked by the browser. Tap play again.");
      } finally {
        setLoading(false);
      }
    } else {
      audio.pause();
    }
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={cn("rounded-2xl border border-line bg-white p-5 shadow-soft", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
        }}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) ? value : 0);
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onError={() => setError("The audio could not be loaded. It may still be generating, or the file is unavailable.")}
      />
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={toggle}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-accent"
          aria-label={playing ? "Pause audio recap" : "Play audio recap"}
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : playing ? (
            <Pause className="size-5" fill="currentColor" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-5" fill="currentColor" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{title}</p>
              {subtitle ? (
                <p className="mt-0.5 text-[0.7rem] text-ink-faint">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
                  setRate(next);
                  if (audioRef.current) audioRef.current.playbackRate = next;
                }}
                className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink-faint hover:border-ink/30 hover:text-ink"
                aria-label="Change playback speed"
              >
                {rate}×
              </button>
              {downloadName ? (
                <a
                  href={src}
                  download={downloadName}
                  className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-paper hover:text-ink"
                  aria-label="Download audio"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="w-9 shrink-0 text-right font-mono text-[0.62rem] text-ink-faint">
              {formatTimestamp(current)}
            </span>
            <div className="relative flex-1">
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={current}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setCurrent(value);
                  if (audioRef.current) audioRef.current.currentTime = value;
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line outline-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-line) ${progress}%)`,
                }}
                aria-label="Audio progress"
              />
            </div>
            <span className="w-9 shrink-0 font-mono text-[0.62rem] text-ink-faint">
              {formatTimestamp(duration)}
            </span>
          </div>
        </div>
      </div>
      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-clay-soft px-3 py-2 text-xs text-clay">
          <Volume2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}
    </div>
  );
}
