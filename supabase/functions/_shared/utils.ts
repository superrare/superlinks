// Supabase edge-function code uses 2-space indentation (Deno convention).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

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

export async function getUser(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload.sub) throw new Error("Unauthorized: no subject in token");
  const user = {
    id: payload.sub as string,
    email: payload.email as string | undefined,
  };
  // Service-role client is safe to reuse since we enforce user.id checks in handlers.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return { user, supabase };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Get a public URL for a file in a public storage bucket. */
export function publicUrl(
  _supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

/** Generate a signed URL for a file in a private storage bucket (1 hour expiry). */
export async function signedUrl(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
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
