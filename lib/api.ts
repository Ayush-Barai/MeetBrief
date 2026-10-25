import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, safeErrorMessage } from "@/lib/errors";
import { ConfigurationError } from "@/lib/config";
import { DatabaseNotConfiguredError } from "@/lib/mongodb/client";

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Some fields are invalid. Check the highlighted values and try again.",
        code: "VALIDATION_ERROR",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      { error: error.message, code: "DATABASE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  if (error instanceof ConfigurationError) {
    return NextResponse.json(
      { error: error.message, code: "NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status },
    );
  }
  console.error("[meetbrief:api]", {
    name: (error as Error)?.name,
    code: (error as { code?: string })?.code,
  });
  return NextResponse.json(
    { error: safeErrorMessage(error), code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Your browser session is missing. Reload the page and try again." },
    { status: 401 },
  );
}

export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";
  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) return "invalid";
  if (!startRaw) {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(startRaw);
  const end = endRaw ? Number(endRaw) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return "invalid";
  }
  return { start, end: Math.min(end, size - 1) };
}
