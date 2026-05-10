import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sanitize: trim whitespace, strip trailing slashes and any extra path segments
// The secret was stored as https://xxx.supabase.co/rest/v1 — we only want the origin
function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    // Return only origin (scheme + host + port), no path
    return parsed.origin;
  } catch {
    return undefined;
  }
}

const supabaseUrl = sanitizeUrl(rawUrl);
const supabaseAnonKey = rawKey?.trim();

console.log("[NutriVault] Supabase URL (sanitized):", supabaseUrl ?? "(not set)");
console.log("[NutriVault] Supabase Key set:", !!supabaseAnonKey);

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseReady = !!supabase;
