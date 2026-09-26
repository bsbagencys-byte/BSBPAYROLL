import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig, hasSupabaseConfig } from "./env";

export function createClient() {
  if (!hasSupabaseConfig()) return null;
  const { url, anonKey } = getPublicSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
