import { describe, expect, it } from "vitest";
import { normalizeSupabaseProjectUrl } from "../env";

describe("normalizeSupabaseProjectUrl", () => {
  it("keeps Supabase clients pointed at the project origin", () => {
    expect(
      normalizeSupabaseProjectUrl("https://project-ref.supabase.co/auth/v1"),
    ).toBe("https://project-ref.supabase.co");
    expect(
      normalizeSupabaseProjectUrl("https://project-ref.supabase.co/rest/v1"),
    ).toBe("https://project-ref.supabase.co");
  });

  it("trims a trailing slash for non-Supabase URLs", () => {
    expect(normalizeSupabaseProjectUrl("http://localhost:54321/")).toBe(
      "http://localhost:54321",
    );
  });
});
