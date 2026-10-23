import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import {
  buildCreditCardCancelAuthRequest,
  buildTradeInfoQuery,
  decryptTradeInfo,
  getNewebPayConfig,
  parseTradeInfo,
} from "../newebpay";
import { completeNewebPayRefund, returnCardPayment } from "../refunds";

const ORIGINAL_ENV = { ...process.env };
const KEY = "1234567890ABCDEF1234567890ABCDEF";
const IV = "ABCDEF1234567890";

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function config() {
  process.env.NEWEBPAY_MERCHANT_ID = "MS123456789";
  process.env.NEWEBPAY_HASH_KEY = KEY;
  process.env.NEWEBPAY_HASH_IV = IV;
  process.env.NEWEBPAY_ENV = "sandbox";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.pacergo.app";
  return getNewebPayConfig();
}

const payment = { merchantOrderNo: "PG261023133304E9186EB3A0", tradeNo: "26102321335191092", amount: 400 };
const now = new Date("2026-10-23T13:40:00Z");

describe("NewebPay request builders", () => {
  it("builds the NPA-B01 cancel-authorization (void) request", () => {
    const req = buildCreditCardCancelAuthRequest({ config: config(), ...payment, now });
    expect(req.action).toBe("https://ccore.newebpay.com/API/CreditCard/Cancel");
    expect(req.fields.MerchantID_).toBe("MS123456789");
    expect(parseTradeInfo(decryptTradeInfo(req.fields.PostData_!, KEY, IV))).toEqual({
      RespondType: "JSON",
      Version: "1.0",
      Amt: "400",
      MerchantOrderNo: payment.merchantOrderNo,
      TradeNo: payment.tradeNo,
      IndexType: "1",
      TimeStamp: String(Math.floor(now.getTime() / 1000)),
    });
  });

  it("signs the QueryTradeInfo lookup with IV / sorted fields / Key", () => {
    const req = buildTradeInfoQuery({ config: config(), merchantOrderNo: payment.merchantOrderNo, amount: 400, now });
    expect(req.action).toBe("https://ccore.newebpay.com/API/QueryTradeInfo");
    const expected = crypto
      .createHash("sha256")
      .update(`IV=${IV}&Amt=400&MerchantID=MS123456789&MerchantOrderNo=${payment.merchantOrderNo}&Key=${KEY}`)
      .digest("hex")
      .toUpperCase();
    expect(req.fields).toMatchObject({
      MerchantID: "MS123456789",
      Version: "1.3",
      RespondType: "JSON",
      MerchantOrderNo: payment.merchantOrderNo,
      Amt: "400",
      CheckValue: expected,
    });
  });
});

/** Fake NewebPay: answers the status lookup with `trade`, records every other call. */
function fakeGateway(trade: Record<string, string>, mutation = { Status: "SUCCESS" }) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    const body = u.endsWith("/API/QueryTradeInfo")
      ? { Status: "SUCCESS", Result: { TradeStatus: "1", CloseStatus: "0", BackStatus: "0", ...trade } }
      : mutation;
    return new Response(JSON.stringify(body), { status: 200 });
  });
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

describe("returnCardPayment", () => {
  it("voids a charge NewebPay hasn't captured yet (a refund would be rejected)", async () => {
    const gw = fakeGateway({ CloseStatus: "0" });
    const out = await returnCardPayment({ config: config(), payment, fetchImpl: gw.fetchImpl });
    expect(out).toEqual({ outcome: "returned", via: "void" });
    expect(gw.calls.at(-1)).toBe("https://ccore.newebpay.com/API/CreditCard/Cancel");
  });

  it("refunds a captured charge", async () => {
    const gw = fakeGateway({ CloseStatus: "3" });
    const out = await returnCardPayment({ config: config(), payment, fetchImpl: gw.fetchImpl });
    expect(out).toEqual({ outcome: "returned", via: "refund" });
    expect(gw.calls.at(-1)).toBe("https://ccore.newebpay.com/API/CreditCard/Close");
  });

  it("leaves a charge mid-capture for staff, without touching the gateway", async () => {
    for (const CloseStatus of ["1", "2"]) {
      const gw = fakeGateway({ CloseStatus });
      const out = await returnCardPayment({ config: config(), payment, fetchImpl: gw.fetchImpl });
      expect(out.outcome).toBe("manual_required");
      expect(gw.calls).toEqual(["https://ccore.newebpay.com/API/QueryTradeInfo"]);
    }
  });

  it("records an already voided or refunded charge without calling the gateway again", async () => {
    const states: Record<string, string>[] = [{ TradeStatus: "3" }, { BackStatus: "1" }, { BackStatus: "3" }];
    for (const trade of states) {
      const gw = fakeGateway(trade);
      const out = await returnCardPayment({ config: config(), payment, fetchImpl: gw.fetchImpl });
      expect(out).toEqual({ outcome: "returned", via: "already" });
      expect(gw.calls).toEqual(["https://ccore.newebpay.com/API/QueryTradeInfo"]);
    }
  });

  it("asks for staff when the void or refund is rejected", async () => {
    const gw = fakeGateway({ CloseStatus: "0" }, { Status: "TRA10045" });
    const out = await returnCardPayment({ config: config(), payment, fetchImpl: gw.fetchImpl });
    expect(out).toEqual({ outcome: "manual_required", reason: "TRA10045" });
  });

  it("asks for staff when the status lookup fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("oops", { status: 502 })) as unknown as typeof fetch;
    const out = await returnCardPayment({ config: config(), payment, fetchImpl });
    expect(out.outcome).toBe("manual_required");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("completeNewebPayRefund", () => {
  const candidate = {
    id: "pay1",
    merchant_order_no: payment.merchantOrderNo,
    provider_trade_no: payment.tradeNo,
    amount: 400,
    payment_method: "CREDIT",
  };
  const adminWith = (error: unknown = null) => {
    const rpc = vi.fn(async () => ({ error }));
    return { rpc, admin: { rpc } as never };
  };

  it("records the refund only after NewebPay returned the money", async () => {
    const gw = fakeGateway({ CloseStatus: "0" });
    const { admin, rpc } = adminWith();
    const out = await completeNewebPayRefund({ admin, config: config(), payment: candidate, fetchImpl: gw.fetchImpl });
    expect(out).toEqual({ refund: "automatic" });
    expect(rpc).toHaveBeenCalledWith("record_newebpay_refund", {
      p_payment_id: "pay1",
      p_provider_trade_no: payment.tradeNo,
    });
  });

  it("leaves non-card payments for staff without calling NewebPay", async () => {
    const gw = fakeGateway({ CloseStatus: "0" });
    const { admin, rpc } = adminWith();
    for (const payment_method of ["VACC", "WEBATM", "CVS", "GOOGLEPAY", null]) {
      const out = await completeNewebPayRefund({
        admin,
        config: config(),
        payment: { ...candidate, payment_method },
        fetchImpl: gw.fetchImpl,
      });
      expect(out).toEqual({ refund: "manual_required", reason: "not_card" });
    }
    expect(gw.calls).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("doesn't record when NewebPay refused, and flags a failed record for reconciliation", async () => {
    const refused = fakeGateway({ CloseStatus: "0" }, { Status: "TRA10045" });
    const a = adminWith();
    expect(
      await completeNewebPayRefund({ admin: a.admin, config: config(), payment: candidate, fetchImpl: refused.fetchImpl }),
    ).toEqual({ refund: "manual_required", reason: "TRA10045" });
    expect(a.rpc).not.toHaveBeenCalled();

    const ok = fakeGateway({ CloseStatus: "0" });
    const b = adminWith({ message: "boom" });
    expect(
      await completeNewebPayRefund({ admin: b.admin, config: config(), payment: candidate, fetchImpl: ok.fetchImpl }),
    ).toEqual({ refund: "manual_required", reason: "record_failed" });
  });
});
