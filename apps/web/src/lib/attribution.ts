/** Where a sign-up came from (e.g. the website's Taichung validation section
 *  links to /sign-up?utm_source=website&utm_medium=taichung_validation).
 *  Captured when the auth page loads, kept for the tab session, and sent in
 *  signUp()'s metadata. Supabase stores it in auth.users.raw_user_meta_data,
 *  so it needs no column of its own. */

const KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
const STORAGE_KEY = "pacergo.signupAttribution";

export type SignUpAttribution = Partial<Record<(typeof KEYS)[number], string>>;

/** Short, plain tokens only — this is user-controlled input from a URL. */
function clean(value: string | null): string | undefined {
  const v = value?.trim().slice(0, 64) ?? "";
  return /^[\w.\-]+$/.test(v) ? v : undefined;
}

export function parseAttribution(search: string): SignUpAttribution {
  const params = new URLSearchParams(search);
  const out: SignUpAttribution = {};
  for (const key of KEYS) {
    const v = clean(params.get(key));
    if (v) out[key] = v;
  }
  return out;
}

/** Call on the auth page. A later page without UTM tags never overwrites. */
export function captureAttribution(search: string): void {
  const found = parseAttribution(search);
  if (Object.keys(found).length === 0) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    // Storage blocked: attribution is best-effort, never block sign-up.
  }
}

export function readAttribution(search = ""): SignUpAttribution {
  const fromUrl = parseAttribution(search);
  if (Object.keys(fromUrl).length > 0) return fromUrl;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? parseAttribution(new URLSearchParams(JSON.parse(raw)).toString()) : {};
  } catch {
    return {};
  }
}
