// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_CONFIGURED: true }));
vi.mock("../supabase/env", () => ({ SUPABASE_CONFIGURED: true }));

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("../supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser }, rpc }),
}));

import { getMyEarnings } from "../earnings";
import { getPayoutDetail } from "../admin";
import { encryptField } from "../crypto/field-encryption";

const TRAINER = "7c1d3c34-0000-4000-8000-000000000001";
const OTHER = "7c1d3c34-0000-4000-8000-000000000002";

const bank = (number: string | null) => ({
  bank_code: "822",
  bank_name: "CTBC Bank",
  branch_name: "Da'an",
  bank_account_number: number,
  bank_account_holder: "Wang",
  bank_account_mask: "********0912",
});

function earningsRpc(bankValue: unknown) {
  rpc.mockImplementation(async (name: string) => {
    if (name === "my_bank_account") return { data: bankValue };
    if (name === "my_trainer_balance") return { data: 0 };
    return { data: [] };
  });
}

const original = process.env.ENCRYPTION_KEY;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.ENCRYPTION_KEY = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  getUser.mockResolvedValue({ data: { user: { id: TRAINER } } });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  if (original === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = original;
});

describe("getMyEarnings — the trainer's own bank account", () => {
  it("decrypts the saved number so the form can show it", async () => {
    earningsRpc(bank(await encryptField("123456780912", TRAINER)));
    const { bank: b } = await getMyEarnings();
    expect(b?.bank_account_number).toBe("123456780912");
    expect(b?.bank_account_mask).toBe("********0912");
    expect(b?.bank_name).toBe("CTBC Bank");
  });

  it("still reads legacy plaintext", async () => {
    earningsRpc(bank("123456780912"));
    expect((await getMyEarnings()).bank?.bank_account_number).toBe("123456780912");
  });

  it("has no number to decrypt when no account was saved", async () => {
    earningsRpc(bank(null));
    expect((await getMyEarnings()).bank?.bank_account_number).toBeNull();
    earningsRpc(null);
    expect((await getMyEarnings()).bank).toBeNull();
  });

  it("leaves the number blank — not a broken page — when it can't be decrypted", async () => {
    earningsRpc(bank(await encryptField("123456780912", OTHER))); // not this user's
    const { bank: b } = await getMyEarnings();
    expect(b?.bank_account_number).toBeNull();
    expect(b?.bank_account_mask).toBe("********0912"); // the mask still shows
  });

  it("leaves it blank when the key is missing", async () => {
    const cipher = await encryptField("123456780912", TRAINER);
    delete process.env.ENCRYPTION_KEY;
    earningsRpc(bank(cipher));
    expect((await getMyEarnings()).bank?.bank_account_number).toBeNull();
  });

  it("never exposes ciphertext to the page", async () => {
    earningsRpc(bank(await encryptField("123456780912", OTHER)));
    expect(JSON.stringify(await getMyEarnings())).not.toContain("enc:v1:");
  });
});

describe("getPayoutDetail — the admin payout page", () => {
  const detail = (number: string | null) => ({
    id: "w1",
    trainer_id: TRAINER,
    trainer_name: "Tom",
    amount: 1000,
    status: "requested",
    bank_account_number: number,
    history: [],
  });

  it("decrypts the trainer's number for the admin", async () => {
    rpc.mockResolvedValue({ data: detail(await encryptField("123456780912", TRAINER)), error: null });
    expect((await getPayoutDetail("w1"))?.bank_account_number).toBe("123456780912");
  });

  it("reads legacy plaintext as it is", async () => {
    rpc.mockResolvedValue({ data: detail("123456780912"), error: null });
    expect((await getPayoutDetail("w1"))?.bank_account_number).toBe("123456780912");
  });

  it("shows it as missing — never as ciphertext — when it can't be decrypted", async () => {
    rpc.mockResolvedValue({ data: detail(await encryptField("123456780912", OTHER)), error: null });
    const result = await getPayoutDetail("w1");
    expect(result?.bank_account_number).toBeNull();
    expect(JSON.stringify(result)).not.toContain("enc:v1:");
  });

  it("passes a missing number through", async () => {
    rpc.mockResolvedValue({ data: detail(null), error: null });
    expect((await getPayoutDetail("w1"))?.bank_account_number).toBeNull();
  });
});
