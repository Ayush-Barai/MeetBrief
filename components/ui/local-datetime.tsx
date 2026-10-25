"use client";

import { useEffect, useState } from "react";

type DateValue = string | Date | null | undefined;

function formatDateTime(value: DateValue, timeZone?: string): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

function formatDate(value: DateValue, timeZone?: string): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/**
 * Renders a date in the viewer's locale/timezone without breaking hydration.
 *
 * The server and the first client render both use UTC, then the component
 * switches to the viewer's local timezone after mount.
 */
export function LocalDateTime({ value }: { value: DateValue }) {
  const [text, setText] = useState(() => formatDateTime(value, "UTC"));

  useEffect(() => {
    setText(formatDateTime(value));
  }, [value]);

  return <span suppressHydrationWarning>{text}</span>;
}

export function LocalDate({ value }: { value: DateValue }) {
  const [text, setText] = useState(() => formatDate(value, "UTC"));

  useEffect(() => {
    setText(formatDate(value));
  }, [value]);

  return <span suppressHydrationWarning>{text}</span>;
}
