import "server-only";

import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import { openFileStream } from "@/lib/storage/gridfs";

export async function audioResponse(
  fileId: ObjectId,
  mimeType: string,
  request: Request,
  filename?: string,
): Promise<Response> {
  const rangeHeader = request.headers.get("range");
  let range: { start: number; end: number } | null = null;
  let partial = false;

  const info = await openFileStream(fileId);
  const size = info.info.length;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      return new Response("Invalid range", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const [, startRaw, endRaw] = match;
    let start = startRaw ? Number(startRaw) : 0;
    let end = endRaw ? Number(endRaw) : size - 1;
    if (!startRaw && endRaw) {
      start = Math.max(0, size - Number(endRaw));
      end = size - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return new Response("Invalid range", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    end = Math.min(end, size - 1);
    range = { start, end };
    partial = true;
  }

  const opened = await openFileStream(fileId, range ?? undefined);
  const nodeStream = opened.stream as Readable;
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  const headers = new Headers({
    "Content-Type": mimeType || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Length": String(opened.end - opened.start + 1),
    "X-Content-Type-Options": "nosniff",
  });
  if (filename) {
    headers.set(
      "Content-Disposition",
      `inline; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
    );
  }
  if (partial) {
    headers.set(
      "Content-Range",
      `bytes ${opened.start}-${opened.end}/${size}`,
    );
  }

  return new Response(webStream, { status: partial ? 206 : 200, headers });
}
