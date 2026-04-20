// Supabase edge-function code uses 2-space indentation (Deno convention).
import { svcSupabase } from "./supabase.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info, x-user-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1];
  const decoded = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded);
}

/**
 * Verify a user JWT and return the authenticated user plus the shared service-role client.
 *
 * Verification is performed by Supabase Auth (`auth.getUser`), which validates the
 * token signature and expiry. We intentionally do NOT trust the raw payload.
 *
 * Service-role client is safe to reuse across requests since every handler
 * enforces `user.id` checks explicitly — we are not relying on RLS.
 */
export async function getUser(token: string) {
  const { data, error } = await svcSupabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error("Unauthorized: invalid or expired token");
  }
  const user = {
    id: data.user.id,
    email: data.user.email ?? undefined,
  };
  return { user, supabase: svcSupabase };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Get a public URL for a file in a public storage bucket. */
export function publicUrl(bucket: string, path: string): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

/** Minimal HTML-attribute/text escaper to prevent XSS when interpolating into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacVerify(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  return expected === signature;
}
