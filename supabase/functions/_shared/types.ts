// Supabase edge-function code uses 2-space indentation (Deno convention).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

/** Context passed to every authenticated POST handler. */
export type PostHandlerCtx = {
  user: { id: string; email?: string };
  supabase: SupabaseClient;
  body: Record<string, unknown>;
};

/** Context passed to every GET route handler. */
export type GetHandlerCtx = {
  req: Request;
  /** Full path segments after splitting on '/'. */
  segments: string[];
  /** The segment immediately after the route key (e.g. slug or product id). */
  resourceId: string;
};

/** Context passed to public (no-auth) POST actions. */
export type PublicCtx = {
  body: Record<string, unknown>;
};
