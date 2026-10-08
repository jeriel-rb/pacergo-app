import { afterEach, describe, expect, it } from "vitest";
import {
  createMerchantOrderNo,
  createTradeSha,
  decryptTradeInfo,
  encryptTradeInfo,
  getNewebPayConfig,
  getAmount,
  getMerchantOrderNo,
  mapProviderStatus,
  parseNewebPayFormData,
  parseTradeInfo,
  serializeTradeInfo,
  verifyAndDecodeCallback,
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

describe("NewebPay callbacks", () => {
  const KEY = "1234567890ABCDEF1234567890ABCDEF";
  const IV = "ABCDEF1234567890";

  /** A notify body signed the way NewebPay signs it (RespondType=JSON). */
  function signedFields() {
    const decoded = {
      Status: "SUCCESS",
      Message: "付款成功",
      Result: {
        MerchantID: "MS123456789",
        Amt: 400,
        TradeNo: "26100822420561861",
        MerchantOrderNo: "PG2610081441426D98E2B63D",
        PaymentType: "WEBATM",
        PayTime: "2026-10-08 22:42:05",
      },
    };
    const tradeInfo = encryptTradeInfo(JSON.stringify(decoded), KEY, IV);
    return {
      Status: "SUCCESS",
      MerchantID: "MS123456789",
      Version: "2.3",
      TradeInfo: tradeInfo,
      TradeSha: createTradeSha(tradeInfo, KEY, IV),
    };
  }

  function request(body: string, contentType?: string) {
    return new Request("https://app.pacergo.app/api/payments/newebpay/notify", {
      method: "POST",
      body,
      headers: contentType ? { "content-type": contentType } : {},
    });
  }

  async function decodes(req: Request) {
    setPaymentEnv();
    const fields = await parseNewebPayFormData(req);
    const parsed = verifyAndDecodeCallback(fields, getNewebPayConfig());
    expect(getMerchantOrderNo(parsed.decoded)).toBe("PG2610081441426D98E2B63D");
    expect(getAmount(parsed.decoded)).toBe(400);
    expect(mapProviderStatus(parsed.decoded)).toBe("paid");
  }

  it("accepts a normal form post", async () => {
    await decodes(request(new URLSearchParams(signedFields()).toString(), "application/x-www-form-urlencoded"));
  });

  it("accepts a URL-encoded body with no or a different content type", async () => {
    const body = new URLSearchParams(signedFields()).toString();
    await decodes(request(body));
    await decodes(request(body, "text/plain; charset=utf-8"));
  });

  it("accepts a JSON body", async () => {
    await decodes(request(JSON.stringify(signedFields()), "application/json"));
  });

  it("rejects a body without the signed fields", async () => {
    await expect(parseNewebPayFormData(request("hello=world"))).rejects.toThrow("payment_callback_invalid");
  });
});
