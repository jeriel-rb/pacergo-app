import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { RECOVERY_SESSION_MAX_AGE_SECONDS } from "./password-reset";

/**
 * The "this browser just verified a password-recovery link" marker.
 *
 * It used to be the literal text `1`, which anyone can type into their own
 * cookie jar — turning "has a normal login session" into "may change the
 * password without knowing the old one". It is now `<userId>.<expiresAt>.<sig>`:
 * signed with a server-only key, tied to the user it was issued for, and
 * time-limited, so it can only be produced by the server after a recovery link
 * was really verified. Server-only (uses Node crypto).
 */

// RECOVERY_COOKIE_SECRET if set; otherwise the Supabase service-role key (already
// a server-only secret). A random per-process key is the last resort (local dev
// without keys): markers then simply stop validating after a restart.
let fallbackKey: string | undefined;
function signingKey(): string {
  return (
    process.env.RECOVERY_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (fallbackKey ??= randomBytes(32).toString("hex"))
  );
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(`pacergo-recovery:${payload}`).digest("base64url");
}

export function createRecoveryMarker(userId: string, now = Date.now()): string {
  const payload = `${userId}.${now + RECOVERY_SESSION_MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

/** True only for an unexpired marker the server issued for `userId`. */
export function isValidRecoveryMarker(
  value: string | null | undefined,
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!value || !userId) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [markerUser, expiresAt, signature] = parts as [string, string, string];
  if (markerUser !== userId) return false;
  const expires = Number(expiresAt);
  if (!Number.isFinite(expires) || expires < now) return false;

  const expected = Buffer.from(sign(`${markerUser}.${expiresAt}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
