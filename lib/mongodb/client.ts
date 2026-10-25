import "server-only";

import { MongoClient, type Db } from "mongodb";
import { config, isDatabaseConfigured } from "@/lib/config";

declare global {
  // eslint-disable-next-line no-var
  var __meetbriefMongoClient: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __meetbriefIndexes: Promise<void> | undefined;
}

export class DatabaseNotConfiguredError extends Error {
  code = "DATABASE_NOT_CONFIGURED";
  constructor() {
    super(
      "MongoDB is not configured. Add MONGODB_URI to your environment and restart the server.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

function createClientPromise(): Promise<MongoClient> {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const client = new MongoClient(config.mongoUri!, {
    appName: "meetbrief-ai",
    serverSelectionTimeoutMS: 8_000,
    maxPoolSize: 10,
  });
  return client.connect();
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!global.__meetbriefMongoClient) {
    global.__meetbriefMongoClient = createClientPromise().catch((error) => {
      // Do not cache a rejected connection promise: a later request may recover.
      global.__meetbriefMongoClient = undefined;
      throw error;
    });
  }
  return global.__meetbriefMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(config.mongoDbName);
  await ensureIndexes(db);
  return db;
}

export async function ensureIndexes(db: Db): Promise<void> {
  if (!global.__meetbriefIndexes) {
    global.__meetbriefIndexes = (async () => {
      await Promise.all([
        db.collection("meetings").createIndexes([
          { key: { userId: 1, createdAt: -1 }, name: "user_created" },
          { key: { userId: 1, status: 1 }, name: "user_status" },
          { key: { status: 1, updatedAt: -1 }, name: "status_updated" },
          {
            key: { "share.tokenHash": 1 },
            name: "share_token",
            sparse: true,
          },
        ]),
        db.collection("transcript_segments").createIndexes([
          { key: { meetingId: 1, position: 1 }, name: "meeting_position" },
          { key: { meetingId: 1, startSeconds: 1 }, name: "meeting_start" },
        ]),
        db.collection("reports").createIndexes([
          { key: { meetingId: 1 }, name: "meeting_unique", unique: true },
        ]),
        db.collection("action_items").createIndexes([
          { key: { meetingId: 1, createdAt: 1 }, name: "meeting_created" },
          { key: { meetingId: 1, status: 1 }, name: "meeting_status" },
          { key: { status: 1, updatedAt: -1 }, name: "status_updated" },
        ]),
      ]);
    })().catch((error) => {
      global.__meetbriefIndexes = undefined;
      throw error;
    });
  }
  return global.__meetbriefIndexes;
}

export const COLLECTIONS = {
  meetings: "meetings",
  transcripts: "transcript_segments",
  reports: "reports",
  actions: "action_items",
  files: "meeting_files",
} as const;

export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  const client = await getMongoClient();
  await client.db(config.mongoDbName).command({ ping: 1 });
  return { ok: true, latencyMs: Date.now() - started };
}
