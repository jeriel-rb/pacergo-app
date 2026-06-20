export type AuthProvider = "google" | "apple";

/**
 * Mock social sign-in. Simulates an OAuth round-trip; real Supabase OAuth wires
 * in here when auth goes live (see packages/api).
 */
export async function signInWithProvider(
  provider: AuthProvider,
): Promise<{ provider: AuthProvider }> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { provider };
}
