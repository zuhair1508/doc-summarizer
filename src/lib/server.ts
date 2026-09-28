import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { createHash, randomUUID } from "node:crypto";

export const BUCKET = "uploads";
const CLIENT_COOKIE = "ds_cid";

// All DB access goes through the service role on the server. RLS is enabled with no
// policies, so the anon key (never shipped to the browser) can't read anything.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Anonymous per-browser identity. Readable from server components; only route
// handlers can create it (cookies are read-only during render).
export async function getClientId(): Promise<string | null> {
  const value = (await cookies()).get(CLIENT_COOKIE)?.value;
  return value && /^[0-9a-f-]{36}$/.test(value) ? value : null;
}

export async function ensureClientId(): Promise<string> {
  const existing = await getClientId();
  if (existing) return existing;
  const id = randomUUID();
  (await cookies()).set(CLIENT_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export function hashPages(kind: string, pages: string[]) {
  return createHash("sha256").update(kind).update("\0").update(pages.join("\f")).digest("hex");
}

export async function signedPdfUrl(storagePath: string | null) {
  if (!storagePath) return null;
  const { data } = await db().storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}

const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR ?? 5);

/** Returns seconds until the next slot frees up, or 0 if the request may proceed. */
export async function checkRateLimit(ip: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("rate_events")
    .select("created_at")
    .eq("ip", ip)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (data.length < RATE_LIMIT_PER_HOUR) return 0;
  const oldest = new Date(data[0].created_at).getTime();
  return Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - Date.now()) / 1000));
}
