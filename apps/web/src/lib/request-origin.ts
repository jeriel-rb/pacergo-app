import { NextResponse } from "next/server";
import { getTrustedAppOrigin } from "@/lib/auth-callback";

/**
 * Reject cross-site cookie POSTs. Browsers send `Origin` on cross-origin
 * fetches; same-site form posts usually omit it or match the host. We allow
 * missing Origin when Sec-Fetch-Site is not cross-site (same-origin navigations,
 * older clients), and always allow the configured app origin / request Host /
 * Vercel deployment host.
 */
export function forbidCrossSiteOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");

  if (!origin) {
    if (site === "cross-site") {
      return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
    }
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const trusted = getTrustedAppOrigin();
  if (trusted && parsed.origin === trusted) return null;

  const host = request.headers.get("host");
  if (host && parsed.host === host) return null;

  const vercel = process.env.VERCEL_URL?.replace(/^https?:\/\//, "");
  if (vercel && parsed.host === vercel) return null;

  return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
}
