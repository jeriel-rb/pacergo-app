import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPaymentForm, decryptTradeInfo, getNewebPayConfig, parseTradeInfo } from "../newebpay";
import { newebpayProvider } from "../provider";

const ORIGINAL_ENV = { ...process.env };
const KEY = "1234567890ABCDEF1234567890ABCDEF";
const IV = "ABCDEF1234567890";

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setPaymentEnv(appUrl = "https://app.pacergo.app") {
  process.env.NEWEBPAY_MERCHANT_ID = "MS123456789";
  process.env.NEWEBPAY_HASH_KEY = KEY;
  process.env.NEWEBPAY_HASH_IV = IV;
  process.env.NEWEBPAY_ENV = "sandbox";
  process.env.NEXT_PUBLIC_APP_URL = appUrl;
}

describe("NewebPay checkout limits", () => {
  it("closes NewebPay's payment page after 15 minutes (the database waits 20 before a retry)", () => {
    setPaymentEnv();
    const form = buildPaymentForm({
      config: getNewebPayConfig(),
      merchantOrderNo: "PG261023000000ABCDEF12",
      amount: 400,
      itemDesc: "PacerGo booking",
      locale: "en",
    });
    const params = parseTradeInfo(decryptTradeInfo(form.fields.TradeInfo!, KEY, IV));
    expect(params.TradeLimit).toBe("900");
  });

  it("refuses checkout on localhost before creating an attempt NewebPay could never confirm", async () => {
    setPaymentEnv("http://localhost:3000");
    const rpc = vi.fn();
    await expect(
      newebpayProvider.createAttempt({
        supabase: { rpc } as never,
        userId: "u1",
        bookingId: "b1",
        merchantOrderNo: "PG261023000000ABCDEF12",
        amount: 400,
        email: null,
        locale: "en",
      }),
    ).rejects.toThrow("payment_gateway_unreachable_locally");
    expect(rpc).not.toHaveBeenCalled();
  });
});
