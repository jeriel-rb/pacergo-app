// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_CONFIGURED: true }));

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser }, rpc }),
}));

import { POST } from "../route";
import { decryptField } from "@/lib/crypto/field-encryption";

const USER = "7c1d3c34-0000-4000-8000-000000000001";
const GOOD = {
  bankCode: "822",
  bankName: "CTBC Bank",
  branchName: "Da'an",
  accountNumber: "123456780912",
  accountHolder: "Wang Xiaoming",
};
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/studio/bank-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const original = process.env.ENCRYPTION_KEY;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.ENCRYPTION_KEY = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  getUser.mockResolvedValue({ data: { user: { id: USER } } });
  rpc.mockResolvedValue({ error: null });
});
afterEach(() => {
  if (original === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = original;
});

describe("POST /api/studio/bank-account", () => {
  it("encrypts the account number on the server and sends only ciphertext + mask to the database", async () => {
    const res = await post(GOOD);
    expect(res.status).toBe(204);
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0]!;
    expect(name).toBe("save_bank_account_encrypted");
    expect(args).toMatchObject({
      p_bank_code: "822",
      p_bank_name: "CTBC Bank",
      p_branch_name: "Da'an",
      p_account_mask: "********0912",
      p_account_holder: "Wang Xiaoming",
    });
    // the plaintext number never reaches Postgres
    expect(JSON.stringify(args)).not.toContain("123456780912");
    expect(args.p_account_cipher).toMatch(/^enc:v1:/);
    // …and it is the owner's ciphertext
    expect(await decryptField(args.p_account_cipher, USER)).toBe("123456780912");
  });

  it("does not call the old plaintext save", async () => {
    await post(GOOD);
    expect(rpc.mock.calls.map((c) => c[0])).not.toContain("save_bank_account");
  });

  it("trims the fields", async () => {
    await post({ ...GOOD, bankName: "  CTBC Bank ", accountNumber: " 123456780912 " });
    expect(rpc.mock.calls[0]![1]).toMatchObject({ p_bank_name: "CTBC Bank", p_account_mask: "********0912" });
  });

  it("requires a signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await post(GOOD);
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["too short", "1234567"],
    ["too long", "12345678901234567"],
    ["letters", "1234abcd5678"],
    ["dashes", "1234-5678-0912"],
    ["empty", ""],
  ])("rejects an account number that is %s", async (_label, accountNumber) => {
    const res = await post({ ...GOOD, accountNumber });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bank_details_invalid" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON, or has non-string fields", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ ...GOOD, accountNumber: 123456780912 })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the database's validation failures back as bank_details_invalid", async () => {
    rpc.mockResolvedValue({ error: { message: "bank_details_invalid" } });
    const res = await post({ ...GOOD, bankCode: "x" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bank_details_invalid" });
  });

  it("reports other database errors as a generic failure, without details", async () => {
    rpc.mockResolvedValue({ error: { message: "connection reset 123456780912" } });
    const res = await post(GOOD);
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe(JSON.stringify({ error: "bank_save_failed" }));
    expect(body).not.toContain("123456780912");
  });

  it("fails clearly — and saves nothing — when the encryption key is missing or invalid", async () => {
    delete process.env.ENCRYPTION_KEY;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await post(GOOD);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "encryption_unavailable" });
    expect(rpc).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("123456780912");
    warn.mockRestore();
  });

  it("is never cached", async () => {
    const res = await post(GOOD);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
