import type { UserProfile } from "@pacergo/shared";
import { USE_MOCK } from "../supabase-client";
import { MOCK_USER } from "../mock/user";

/** The currently signed-in user (mock until Supabase auth is wired). */
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (USE_MOCK) return MOCK_USER;
  throw new Error("Supabase getCurrentUser not implemented yet");
}
