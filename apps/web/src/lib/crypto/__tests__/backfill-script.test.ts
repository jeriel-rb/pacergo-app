// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptField, encryptField } from "../field-encryption";
// The back-fill script is plain ESM so it can run with `node` and no build step.
import * as script from "../../../../../../backend/scripts/encrypt-bank-accounts.mjs";

const keyB64 = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
const U1 = "7c1d3c34-0000-4000-8000-000000000001";
const U2 = "7c1d3c34-0000-4000-8000-000000000002";

beforeEach(() => {
  process.env.ENCRYPTION_KEY = keyB64;
});

/** A tiny in-memory stand-in for the Supabase client calls the script makes. */
function fakeDb(rows: { id: string; bank_account_number: string | null }[], opts: { failFor?: string } = {}) {
  const writes: { id: string; value: string }[] = [];
  const db = {
    from() {
      let range: [number, number] = [0, 999];
      const api = {
        select: () => api,
        not: () => api,
        order: () => api,
        range: (a: number, b: number) => {
          range = [a, b];
          const withNumber = rows.filter((r) => r.bank_account_number !== null);
          // a snapshot, like a real read: later edits to the row don't change what was read
          const page = withNumber.slice(range[0], range[1] + 1).map((r) => ({ ...r }));
          return Promise.resolve({ data: page, error: null });
        },
        update: (patch: { bank_account_number: string }) => {
          const where: Record<string, string> = {};
          const chain = {
            eq: (col: string, val: string) => {
              where[col] = val;
              if (Object.keys(where).length < 2) return chain;
              const row = rows.find((r) => r.id === where.id && r.bank_account_number === where.bank_account_number);
              if (opts.failFor && where.id === opts.failFor) {
                return Promise.resolve({ error: { message: "boom" }, count: null });
              }
              if (row) {
                row.bank_account_number = patch.bank_account_number;
                writes.push({ id: row.id, value: patch.bank_account_number });
              }
              return Promise.resolve({ error: null, count: row ? 1 : 0 });
            },
          };
          return chain;
        },
      };
      return api;
    },
  };
  return { db, writes };
}

describe("encrypt-bank-accounts script", () => {
  it("uses the same scheme as the web app (each can read the other's output)", async () => {
    const key = await script.importKey(keyB64);
    const fromScript = await script.encryptValue("123456780912", key, U1);
    expect(await decryptField(fromScript, U1)).toBe("123456780912");
    const fromApp = await encryptField("123456780912", U1);
    expect(await script.decryptValue(fromApp, key, U1)).toBe("123456780912");
    // …and both bind the value to its owner
    await expect(script.decryptValue(fromScript, key, U2)).rejects.toThrow();
  });

  it("encrypts plaintext rows, skips encrypted and empty ones, and reports counts", async () => {
    const key = await script.importKey(keyB64);
    const already = await encryptField("11112222", U2);
    const rows = [
      { id: U1, bank_account_number: "123456780912" },
      { id: U2, bank_account_number: already },
      { id: "u3", bank_account_number: "" },
      { id: "u4", bank_account_number: null },
    ];
    const { db, writes } = fakeDb(rows);
    const result = await script.backfill({ db, key });
    expect(result).toEqual({ encrypted: 1, skipped: 2, failed: 0 });
    expect(writes).toHaveLength(1);
    expect(writes[0]!.id).toBe(U1);
    expect(await decryptField(writes[0]!.value, U1)).toBe("123456780912");
    expect(rows[1]!.bank_account_number).toBe(already); // untouched
  });

  it("is safe to run twice", async () => {
    const key = await script.importKey(keyB64);
    const rows = [{ id: U1, bank_account_number: "123456780912" }];
    const { db } = fakeDb(rows);
    expect(await script.backfill({ db, key })).toEqual({ encrypted: 1, skipped: 0, failed: 0 });
    expect(await script.backfill({ db, key })).toEqual({ encrypted: 0, skipped: 1, failed: 0 });
  });

  it("changes nothing in a dry run", async () => {
    const key = await script.importKey(keyB64);
    const rows = [{ id: U1, bank_account_number: "123456780912" }];
    const { db, writes } = fakeDb(rows);
    expect(await script.backfill({ db, key, dryRun: true })).toEqual({ encrypted: 1, skipped: 0, failed: 0 });
    expect(writes).toHaveLength(0);
    expect(rows[0]!.bank_account_number).toBe("123456780912");
  });

  it("does not overwrite a value that changed while it was running", async () => {
    const key = await script.importKey(keyB64);
    const rows = [{ id: U1, bank_account_number: "123456780912" }];
    const { db } = fakeDb(rows);
    // the row is edited between the read and the write: the guarded update matches nothing
    const realFrom = db.from.bind(db);
    db.from = () => {
      const api = realFrom() as unknown as { range: (a: number, b: number) => Promise<unknown> };
      const range = api.range;
      api.range = (a: number, b: number) =>
        range(a, b).then((res) => {
          rows[0]!.bank_account_number = "99998888777766";
          return res;
        });
      return api as unknown as ReturnType<typeof realFrom>;
    };
    expect(await script.backfill({ db, key })).toEqual({ encrypted: 0, skipped: 1, failed: 0 });
    expect(rows[0]!.bank_account_number).toBe("99998888777766");
  });

  it("counts failures without stopping, and never prints account numbers", async () => {
    const key = await script.importKey(keyB64);
    const rows = [
      { id: U1, bank_account_number: "123456780912" },
      { id: U2, bank_account_number: "22223333444455" },
    ];
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { db } = fakeDb(rows, { failFor: U1 });
    const result = await script.backfill({ db, key });
    expect(result).toEqual({ encrypted: 1, skipped: 0, failed: 1 });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/\d{8}/);
    log.mockRestore();
  });

  it("pages through many rows", async () => {
    const key = await script.importKey(keyB64);
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: `id-${i}`, bank_account_number: `1234567${i}00` }));
    const { db, writes } = fakeDb(rows);
    expect(await script.backfill({ db, key, pageSize: 2 })).toEqual({ encrypted: 5, skipped: 0, failed: 0 });
    expect(writes).toHaveLength(5);
  });

  it("refuses to start without a valid key", async () => {
    await expect(script.importKey("")).rejects.toThrow("ENCRYPTION_KEY is not set");
    await expect(script.importKey(Buffer.from("short").toString("base64"))).rejects.toThrow(/16, 24 or 32/);
  });
});
