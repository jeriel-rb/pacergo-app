import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({}) }));

import { fetchBankAccountNumber } from "../admin-actions";
import { saveBankAccount } from "../../studio/earnings-actions";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status });

describe("fetchBankAccountNumber (admin reveal)", () => {
  it("asks the server route for that user's number, uncached", async () => {
    fetchMock.mockResolvedValue(json(200, { accountNumber: "123456780912" }));
    expect(await fetchBankAccountNumber("7c1d3c34-0000-4000-8000-000000000001")).toBe("123456780912");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/admin/users/7c1d3c34-0000-4000-8000-000000000001/bank-account");
    expect(init).toMatchObject({ cache: "no-store" });
  });

  it("throws the server's error code", async () => {
    fetchMock.mockResolvedValue(json(403, { error: "forbidden" }));
    await expect(fetchBankAccountNumber("u")).rejects.toThrow("forbidden");
  });

  it("throws a generic code when the response isn't JSON or has no number", async () => {
    fetchMock.mockResolvedValue(json(500, null));
    await expect(fetchBankAccountNumber("u")).rejects.toThrow("reveal_failed");
    fetchMock.mockResolvedValue(json(200, { accountNumber: null }));
    await expect(fetchBankAccountNumber("u")).rejects.toThrow("reveal_failed");
  });
});

describe("saveBankAccount (trainer)", () => {
  const input = {
    bankCode: "822",
    bankName: "CTBC Bank",
    branchName: "Da'an",
    accountNumber: "123456780912",
    accountHolder: "Wang",
  };

  it("posts to our own route (so the server can encrypt) rather than straight to the database", async () => {
    fetchMock.mockResolvedValue(json(204, null));
    await saveBankAccount(input);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/studio/bank-account");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("throws the short error code so the form can show the right message", async () => {
    fetchMock.mockResolvedValue(json(400, { error: "bank_details_invalid" }));
    await expect(saveBankAccount(input)).rejects.toThrow("bank_details_invalid");
    fetchMock.mockResolvedValue(json(503, { error: "encryption_unavailable" }));
    await expect(saveBankAccount(input)).rejects.toThrow("encryption_unavailable");
    fetchMock.mockResolvedValue(json(500, null));
    await expect(saveBankAccount(input)).rejects.toThrow("bank_save_failed");
  });
});
