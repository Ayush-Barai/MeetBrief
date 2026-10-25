import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_SECRET_FALLBACK,
} from "@/lib/auth/constants";

const FALLBACK_SECRET = SESSION_SECRET_FALLBACK;

const encoder = new TextEncoder();

function base64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(uid: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(uid));
  return `${uid}.${base64Url(signature)}`;
}

async function isValid(value: string | undefined, secret: string): Promise<boolean> {
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return false;
  const uid = value.slice(0, dot);
  if (!/^[a-f0-9-]{20,64}$/i.test(uid)) return false;
  const expected = await sign(uid, secret);
  if (expected.length !== value.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ value.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const secret = process.env.SESSION_SECRET?.trim() || FALLBACK_SECRET;
  const current = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValid(current, secret)) return NextResponse.next();

  const uid = crypto.randomUUID();
  const token = await sign(uid, secret);
  const headers = new Headers(request.headers);
  const cookiePairs = request.cookies
    .getAll()
    .filter((cookie) => cookie.name !== SESSION_COOKIE)
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  cookiePairs.push(`${SESSION_COOKIE}=${token}`);
  headers.set("cookie", cookiePairs.join("; "));

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt).*)",
  ],
};
