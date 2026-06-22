import type { UserProfile } from "@pacergo/shared";
import { USE_MOCK } from "../supabase-client";
import { MOCK_USER } from "../mock/user";

/**
 * The currently signed-in user. In mock mode returns a demo user; in live mode
 * returns null until web auth (sessions) is wired — the UI handles "no user".
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (USE_MOCK) return MOCK_USER;
  return null;
}
