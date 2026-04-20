// Supabase edge-function code uses 2-space indentation (Deno convention).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

/**
 * Single service-role client instance reused across all requests in the same
 * isolate. Creating it inside Deno.serve() would re-instantiate it on every
 * request. Handlers that need it for public/pre-auth actions import this directly.
 */
export const svcSupabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
