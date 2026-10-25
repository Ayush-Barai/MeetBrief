import { NextResponse } from "next/server";
import { getIntegrationStatus, isDatabaseConfigured } from "@/lib/config";
import { pingDatabase } from "@/lib/mongodb/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const integrations = getIntegrationStatus();
  let database: { ok: boolean; latencyMs: number | null; error?: string } = {
    ok: false,
    latencyMs: null,
  };

  if (isDatabaseConfigured()) {
    try {
      const result = await pingDatabase();
      database = { ok: result.ok, latencyMs: result.latencyMs };
    } catch {
      database = { ok: false, latencyMs: null, error: "Database ping failed" };
    }
  } else {
    database.error = "MONGODB_URI is not set";
  }

  const degraded = !database.ok;
  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      service: "meetbrief-ai",
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database,
      integrations: {
        transcription: integrations.transcription.configured,
        gemma: integrations.gemma.configured,
        elevenlabs: integrations.elevenlabs.configured,
        auth: integrations.auth.configured,
      },
    },
    {
      status: degraded ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
