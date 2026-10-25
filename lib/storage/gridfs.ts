import "server-only";

import { GridFSBucket, ObjectId, type GridFSFile } from "mongodb";
import { getDb, COLLECTIONS } from "@/lib/mongodb/client";

export interface StoredFileInfo {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

export async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: COLLECTIONS.files });
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  metadata: Record<string, unknown> = {},
): Promise<ObjectId> {
  const bucket = await getBucket();
  return new Promise<ObjectId>((resolve, reject) => {
    const upload = bucket.openUploadStream(filename, {
      metadata: { ...metadata, contentType: mimeType },
    });
    upload.on("error", reject);
    upload.on("finish", () => resolve(upload.id as ObjectId));
    upload.end(buffer);
  });
}

export async function getFileInfo(fileId: ObjectId): Promise<GridFSFile | null> {
  const bucket = await getBucket();
  const files = await bucket.find({ _id: fileId }).limit(1).toArray();
  return files[0] ?? null;
}

export async function downloadFileBuffer(fileId: ObjectId): Promise<Buffer> {
  const bucket = await getBucket();
  const chunks: Buffer[] = [];
  const stream = bucket.openDownloadStream(fileId);
  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export function toStoredFileInfo(file: GridFSFile): StoredFileInfo {
  return {
    id: String(file._id),
    filename: file.filename,
    mimeType:
      typeof file.metadata?.contentType === "string"
        ? file.metadata.contentType
        : "application/octet-stream",
    sizeBytes: file.length,
    uploadedAt: file.uploadDate.toISOString(),
    metadata: file.metadata,
  };
}

export async function openFileStream(
  fileId: ObjectId,
  range?: { start: number; end: number },
): Promise<{
  stream: NodeJS.ReadableStream;
  info: GridFSFile;
  start: number;
  end: number;
  partial: boolean;
}> {
  const bucket = await getBucket();
  const info = await getFileInfo(fileId);
  if (!info) throw new Error("Stored file not found");

  let start = 0;
  let end = info.length - 1;
  let partial = false;

  if (range) {
    start = Math.max(0, range.start);
    end = Math.min(range.end, info.length - 1);
    partial = true;
  }
  if (end < start) throw new Error("Invalid byte range");

  const stream = bucket.openDownloadStream(fileId, { start, end: end + 1 });
  return { stream, info, start, end, partial };
}

export async function deleteFile(fileId: ObjectId | null | undefined): Promise<void> {
  if (!fileId) return;
  const bucket = await getBucket();
  try {
    await bucket.delete(fileId);
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 26) throw error; // FileNotFound
  }
}

export function parseObjectId(value: string | null | undefined): ObjectId | null {
  if (!value || !/^[a-f0-9]{24}$/i.test(value)) return null;
  return new ObjectId(value);
}
