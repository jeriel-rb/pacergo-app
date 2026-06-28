"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

/**
 * Toggle a trainer in the signed-in user's saved list (via RPC).
 * Returns the new saved state, or null when Supabase isn't configured (mock
 * mode) so the caller can keep its optimistic state without persisting.
 */
export async function toggleSaved(companionId: string): Promise<boolean | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("toggle_saved_companion", {
    p_companion_id: companionId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
