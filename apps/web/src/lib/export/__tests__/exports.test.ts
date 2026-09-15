import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";
import { maskBankAccount } from "../mask";
import {
  USERS_EXPORT,
  TRAINERS_EXPORT,
  ORDERS_EXPORT,
  WITHDRAWALS_EXPORT,
  ADMIN_EXPORTS,
  getAdminExport,
  type OrderExportRow,
  type WithdrawalExportRow,
  type UnknownRow,
} from "../exports";

describe("export column sets match spec §5.2 B-9", () => {
  const hasIdColumn = (headers: string[]) =>
    headers.some((h) => /\bID\b/i.test(h) || / ID$/i.test(h));

  it("users export has name columns and no ID columns", () => {
    const headers = USERS_EXPORT.columns.map((c) => c.header);
    expect(headers).toContain("Display Name");
    expect(headers).toContain("Is Admin");
    expect(headers).toContain("Created At");
    expect(hasIdColumn(headers)).toBe(false);
    expect(USERS_EXPORT.resource).toBe("users");
  });

  it("trainers export includes tier and price, with no ID columns", () => {
    const headers = TRAINERS_EXPORT.columns.map((c) => c.header);
    expect(headers).toContain("Tier");
    expect(headers).toContain("Price NTD");
    expect(headers).toContain("Rating Avg");
    expect(headers).toContain("Created At");
    expect(hasIdColumn(headers)).toBe(false);
    expect(TRAINERS_EXPORT.resource).toBe("trainers");
  });

  it("orders export carries every B-9-required column plus transaction dates, no IDs", () => {
    const headers = ORDERS_EXPORT.columns.map((c) => c.header);
    for (const required of [
      "Gross Amount",
      "Platform Fee Rate",
      "Platform Fee Amount",
      "Processing Fee Rate",
      "Processing Fee Amount",
      "Trainer Payable",
      "Payment Status",
      "Refund Status",
      "Service Completed At",
      "Settlement Eligibility",
      "Settlement Status",
      "Created At",
      "Paid At",
    ]) {
      expect(headers).toContain(required);
    }
    expect(hasIdColumn(headers)).toBe(false);
    expect(ORDERS_EXPORT.resource).toBe("orders");
  });

  it("withdrawals export masks the bank account and includes request dates, no IDs", () => {
    const headers = WITHDRAWALS_EXPORT.columns.map((c) => c.header);
    expect(headers).toContain("Bank Account (masked)");
    expect(headers).toContain("Requested At");
    expect(headers).toContain("Settled At");
    expect(hasIdColumn(headers)).toBe(false);
    // The accessor must not return the raw, full value it was given.
    const row = {
      id: "w1",
      bank_account_mask: "807-1234567-89",
    } as unknown as WithdrawalExportRow;
    const col = WITHDRAWALS_EXPORT.columns.find(
      (c) => c.header === "Bank Account (masked)",
    )!;
    expect(col.cell(row)).not.toBe("807-1234567-89");
  });
});

describe("getAdminExport / ADMIN_EXPORTS registry", () => {
  it("exposes exactly the four spec resources", () => {
    expect(Object.keys(ADMIN_EXPORTS).sort()).toEqual(
      ["orders", "trainers", "users", "withdrawals"].sort(),
    );
    expect(getAdminExport("orders")).toBe(ORDERS_EXPORT);
    expect(getAdminExport("bogus")).toBeNull();
  });

  it("filenames are date-stamped and sanitised", () => {
    const name = ORDERS_EXPORT.filename(new Date("2026-10-15T10:30:00Z"));
    expect(name).toBe("pacergo-orders-2026-10-15");
  });
});

describe("no full sensitive data in serialised exports", () => {
  const ORDERS_ROW: OrderExportRow = {
    booking_id: "b1",
    seeker_id: "s1",
    seeker_name: "Alice",
    companion_id: "t1",
    companion_name: "Trainer",
    activity_slug: "gym",
    tier: "A",
    scheduled_start: "2026-10-01T10:00:00Z",
    duration_min: 60,
    location_name: "Taipei",
    agreed_price: 1000,
    is_free: false,
    payment_id: "p1",
    merchant_order_no: "PG1",
    provider_trade_no: "NP1",
    provider: "simulated",
    provider_type: "simulated",
    gross_amount: 1000,
    platform_fee_rate: 0.05,
    platform_fee_amount: 50,
    processing_fee_rate: 0.0,
    processing_fee_amount: 0,
    trainer_payable: 950,
    payment_status: "paid",
    refund_status: "none",
    service_completed_at: null,
    settlement_hold_until: null,
    settlement_eligibility_status: "eligible",
    settlement_status: "unsettled",
    paid_at: "2026-10-01T10:05:00Z",
    failed_at: null,
    expired_at: null,
    created_at: "2026-10-01T09:55:00Z",
  };

  it("renders fee split + settlement columns, transaction dates, and never card numbers", () => {
    const csv = toCsv(ORDERS_EXPORT, [ORDERS_ROW]);
    expect(csv).toContain("1000"); // gross
    expect(csv).toContain("0.05"); // fee rate
    expect(csv).toContain("50"); // fee amount
    expect(csv).toContain("950"); // trainer payable
    expect(csv).toContain("paid");
    expect(csv).toContain("eligible");
    // Wrapped as an Excel text-literal formula (RFC 4180-quoted, so the
    // inner quotes are doubled) so date columns don't render as #### (Excel
    // auto-detecting + right-aligning a narrow date column).
    expect(csv).toContain('"=""2026-10-01 09:55:00"""'); // Created At
    expect(csv).toContain('"=""2026-10-01 10:05:00"""'); // Paid At
    expect(csv).not.toContain("4111111111111111");
    expect(csv).not.toContain("CVV");
    expect(csv).not.toMatch(/,b1,|,s1,|,t1,|,p1,/);
  });

  it("withdrawals CSV never contains the full bank number and shows request date", () => {
    const ROW: WithdrawalExportRow = {
      id: "w1",
      trainer_id: "t1",
      trainer_name: "Trainer",
      amount: 950,
      bank_account_mask: "807-1234567-89",
      status: "requested",
      reason_note: null,
      requested_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
      settled_at: null,
    };
    const csv = toCsv(WITHDRAWALS_EXPORT, [ROW]);
    expect(csv).not.toContain("807-1234567-89");
    expect(csv).toContain(maskBankAccount("807-1234567-89"));
    expect(csv).toContain('"=""2026-10-01 10:00:00"""');
    expect(csv).not.toContain("w1");
    expect(csv).not.toContain("t1");
  });
});

describe("date/time columns render as Excel text literals (avoids #### overflow)", () => {
  it("wraps a valid timestamp as an ='...' formula so Excel treats it as text", () => {
    const row = { created_at: "2026-09-15T10:23:01Z" } as unknown as UnknownRow;
    const col = USERS_EXPORT.columns.find((c) => c.header === "Created At")!;
    expect(col.cell(row)).toBe('="2026-09-15 10:23:01"');
  });

  it("leaves missing/empty timestamps as a truly empty cell (no formula wrapper)", () => {
    const col = USERS_EXPORT.columns.find((c) => c.header === "Created At")!;
    expect(col.cell({ created_at: null } as unknown as UnknownRow)).toBe("");
    expect(col.cell({ created_at: undefined } as unknown as UnknownRow)).toBe(
      "",
    );
  });
});
