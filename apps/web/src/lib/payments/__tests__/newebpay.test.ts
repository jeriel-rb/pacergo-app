import { afterEach, describe, expect, it } from "vitest";
import {
  createMerchantOrderNo,
  createTradeSha,
  decryptTradeInfo,
  encryptTradeInfo,
  getNewebPayConfig,
  mapProviderStatus,
  parseTradeInfo,
  serializeTradeInfo,
  verifyTradeSha,
} from "../newebpay";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setPaymentEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.NEWEBPAY_MERCHANT_ID = "MS123456789";
  process.env.NEWEBPAY_HASH_KEY = "1234567890ABCDEF1234567890ABCDEF";
  process.env.NEWEBPAY_HASH_IV = "ABCDEF1234567890";
  process.env.NEWEBPAY_ENV = "sandbox";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.pacergo.app";
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("NewebPay configuration", () => {
  it("selects the sandbox gateway", () => {
    setPaymentEnv();
    expect(getNewebPayConfig().gatewayUrl).toBe(
      "https://ccore.newebpay.com/MPG/mpg_gateway",
    );
  });

  it("selects the production gateway", () => {
    setPaymentEnv({ NEWEBPAY_ENV: "production" });
    expect(getNewebPayConfig().gatewayUrl).toBe(
      "https://core.newebpay.com/MPG/mpg_gateway",
    );
  });

  it("rejects invalid or missing server configuration safely", () => {
    setPaymentEnv({ NEWEBPAY_ENV: "preview" });
    expect(() => getNewebPayConfig()).toThrow("payment_configuration_invalid");

    setPaymentEnv({ NEWEBPAY_HASH_KEY: undefined });
    expect(() => getNewebPayConfig()).toThrow("payment_configuration_missing");
  });
});

describe("NewebPay cryptography", () => {
  it("serializes with NewebPay-compatible form encoding", () => {
    const serialized = serializeTradeInfo({
      MerchantID: "MS123456789",
      RespondType: "JSON",
      ItemDesc: "PacerGo booking",
      Amt: 1200,
    });

    expect(serialized).toContain("RespondType=JSON");
    expect(serialized).toContain("ItemDesc=PacerGo+booking");
    expect(parseTradeInfo(serialized).Amt).toBe("1200");
  });

  it("encrypts, decrypts, and signs deterministically for fixed input", () => {
    const key = "1234567890ABCDEF1234567890ABCDEF";
    const iv = "ABCDEF1234567890";
    const plain =
      "MerchantID=MS123456789&RespondType=JSON&TimeStamp=1720000000&Version=2.3&MerchantOrderNo=PGTEST0001&Amt=1200&ItemDesc=PacerGo+booking";
    const encrypted = encryptTradeInfo(plain, key, iv);

    expect(encrypted).toMatch(/^[0-9a-f]+$/);
    expect(decryptTradeInfo(encrypted, key, iv)).toBe(plain);

    const sha = createTradeSha(encrypted, key, iv);
    expect(sha).toMatch(/^[0-9A-F]{64}$/);
    expect(verifyTradeSha(encrypted, sha, key, iv)).toBe(true);
    expect(verifyTradeSha(`${encrypted}00`, sha, key, iv)).toBe(false);
  });

  it("generates compatible unique merchant order numbers", () => {
    const first = createMerchantOrderNo(new Date("2026-07-23T10:00:00Z"));
    const second = createMerchantOrderNo(new Date("2026-07-23T10:00:00Z"));

    expect(first).toMatch(/^PG\d{12}[0-9A-F]{10}$/);
    expect(first.length).toBeLessThanOrEqual(30);
    expect(first).not.toBe(second);
  });

  it("keeps asynchronous payment methods pending without PayTime", () => {
    expect(
      mapProviderStatus({
        Status: "SUCCESS",
        Result: { MerchantOrderNo: "PG1", Amt: 1200, PaymentMethod: "VACC" },
      }),
    ).toBe("awaiting_payment");

    expect(
      mapProviderStatus({
        Status: "SUCCESS",
        Result: { MerchantOrderNo: "PG1", Amt: 1200, PaymentMethod: "WEBATM", PayTime: "2026-07-23 10:00:00" },
      }),
    ).toBe("paid");
  });
});
