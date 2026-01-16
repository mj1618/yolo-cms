import type { GenericDatabaseReader } from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel";

export function nowMs() {
  return Date.now();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(triple >> 18) & 63]!;
    out += B64[(triple >> 12) & 63]!;
    out += b === undefined ? "=" : B64[(triple >> 6) & 63]!;
    out += c === undefined ? "=" : B64[triple & 63]!;
  }
  return out;
}

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  if (clean.length % 4 !== 0) throw new Error("Invalid base64");

  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = clean[i]!;
    const c1 = clean[i + 1]!;
    const c2 = clean[i + 2]!;
    const c3 = clean[i + 3]!;
    const n0 = c0 === "=" ? 0 : B64.indexOf(c0);
    const n1 = c1 === "=" ? 0 : B64.indexOf(c1);
    const n2 = c2 === "=" ? 0 : B64.indexOf(c2);
    const n3 = c3 === "=" ? 0 : B64.indexOf(c3);
    if (n0 < 0 || n1 < 0 || n2 < 0 || n3 < 0) throw new Error("Invalid base64");
    const triple = (n0 << 18) | (n1 << 12) | (n2 << 6) | n3;
    out.push((triple >> 16) & 0xff);
    if (c2 !== "=") out.push((triple >> 8) & 0xff);
    if (c3 !== "=") out.push(triple & 0xff);
  }
  return new Uint8Array(out);
}

function base64ToBase64url(b64: string) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlToBase64(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return b64 + pad;
}

function bytesToBase64url(bytes: Uint8Array) {
  return base64ToBase64url(bytesToBase64(bytes));
}

function base64urlToBytes(b64url: string) {
  return base64ToBytes(base64urlToBase64(b64url));
}

function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c) throw new Error("Crypto not available");
  return c;
}

const textEncoder = new TextEncoder();

export function newRandomToken() {
  // 32 bytes is plenty; base64url makes it cookie-safe.
  const bytes = new Uint8Array(32);
  getCrypto().getRandomValues(bytes);
  return bytesToBase64url(bytes);
}

export function newSalt() {
  const bytes = new Uint8Array(16);
  getCrypto().getRandomValues(bytes);
  return bytesToBase64url(bytes);
}

export async function hashPassword(password: string, saltBase64url: string) {
  // PBKDF2 is widely supported, deterministic, and good enough for a starter project.
  // Increase iterations over time as needed.
  const crypto = getCrypto();
  const saltBytes = base64urlToBytes(saltBase64url);
  // Convex's TS libs can widen Uint8Array.buffer to ArrayBufferLike; force ArrayBuffer.
  const saltArrayBuffer = saltBytes.buffer as ArrayBuffer;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltArrayBuffer, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    32 * 8,
  );
  return bytesToBase64url(new Uint8Array(bits));
}

export function constantTimeEqual(a: string, b: string) {
  // Avoid early-exit comparisons to reduce timing leakage.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hasAnyUsers(db: GenericDatabaseReader<DataModel>): Promise<boolean> {
  const one = await db.query("users").take(1);
  return one.length > 0;
}

export async function requireSession(
  db: GenericDatabaseReader<DataModel>,
  token: string,
): Promise<{ session: Doc<"sessions">; user: Doc<"users"> }> {
  const session = await db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) throw new Error("Not authenticated");
  if (typeof session.expiresAt === "number" && session.expiresAt <= nowMs()) {
    throw new Error("Session expired");
  }
  const user = await db.get(session.userId);
  if (!user) throw new Error("Not authenticated");
  return { session: session as Doc<"sessions">, user: user as Doc<"users"> };
}

