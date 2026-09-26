export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, anonKey };
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function hasSupabaseConfig() {
  const { url, anonKey } = getPublicSupabaseConfig();
  return Boolean(url && anonKey && !url.includes("YOUR_PROJECT"));
}

export function getAuthEmailDomain() {
  return process.env.AUTH_EMAIL_DOMAIN ?? "auth.bsbpayroll.internal";
}

export function usernameToAuthEmail(username: string) {
  return `${username.toLowerCase()}@${getAuthEmailDomain()}`;
}
