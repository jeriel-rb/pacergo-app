// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_CONFIGURED: true }));

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser }, rpc }),
}));

import { GET } from "../route";
import { encryptField } from "@/lib/crypto/field-encryption";

const ADMIN = "aaaaaaaa-0000-4000-8000-000000000009";
const TRAINER = "7c1d3c34-0000-4000-8000-000000000001";
const OTHER = "7c1d3c34-0000-4000-8000-000000000002";

const call = (id: string) =>
  GET(new Request(`http://localhost/api/admin/users/${id}/bank-account`), {
    params: Promise.resolve({ id }),
  });

const original = process.env.ENCRYPTION_KEY;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.ENCRYPTION_KEY = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  getUser.mockResolvedValue({ data: { user: { id: ADMIN } } });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  if (original === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = original;
});

describe("GET /api/admin/users/[id]/bank-account", () => {
  it("decrypts the stored number for an admin", async () => {
    rpc.mockResolvedValue({ data: await encryptField("123456780912", TRAINER), error: null });
    const res = await call(TRAINER);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accountNumber: "123456780912" });
    expect(rpc).toHaveBeenCalledWith("admin_user_bank_secret", { p_user_id: TRAINER });
  });

  it("is never cached", async () => {
    rpc.mockResolvedValue({ data: await encryptField("123456780912", TRAINER), error: null });
    const res = await call(TRAINER);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("still reveals legacy plaintext values saved before encryption existed", async () => {
    rpc.mockResolvedValue({ data: "123456780912", error: null });
    expect(await (await call(TRAINER)).json()).toEqual({ accountNumber: "123456780912" });
  });

  it("lets only admins in: the database refuses everyone else", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "forbidden" } });
    const res = await call(TRAINER);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("requires a signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call(TRAINER);
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 404 for a malformed id without touching the database", async () => {
    for (const bad of ["abc", "../../etc/passwd", "1; drop table users", ""]) {
      const res = await call(bad);
      expect(res.status).toBe(404);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 404 when the user has no bank account", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await call(TRAINER)).status).toBe(404);
  });

  it("refuses a ciphertext that was copied from another user's row", async () => {
    rpc.mockResolvedValue({ data: await encryptField("123456780912", OTHER), error: null });
    const res = await call(TRAINER);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe(JSON.stringify({ error: "decrypt_failed" }));
    expect(text).not.toContain("123456780912");
  });

  it("reports an unreadable value (wrong key) without leaking anything", async () => {
    const cipher = await encryptField("123456780912", TRAINER);
    process.env.ENCRYPTION_KEY = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
    rpc.mockResolvedValue({ data: cipher, error: null });
    const res = await call(TRAINER);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "decrypt_failed" });
  });

  it("logs who revealed whose account, but never the number", async () => {
    rpc.mockResolvedValue({ data: await encryptField("123456780912", TRAINER), error: null });
    await call(TRAINER);
    const info = vi.mocked(console.info).mock.calls;
    expect(info).toContainEqual(["admin_bank_account_revealed", { admin: ADMIN, user: TRAINER }]);
    const everything = JSON.stringify([...info, ...vi.mocked(console.warn).mock.calls]);
    expect(everything).not.toContain("123456780912");
  });

  it("reports other database errors generically", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "relation exploded" } });
    const res = await call(TRAINER);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "reveal_failed" });
  });
});
