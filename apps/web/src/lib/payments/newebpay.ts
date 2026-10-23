import "server-only";
import crypto from "node:crypto";

export const NEWEBPAY_VERSION = "2.3";
export const NEWEBPAY_SPEC = {
  name: "線上交易─幕前支付技術串接手冊_NDNF-1.2.3",
  documentVersion: "NDNF-1.2.3",
  apiVersion: NEWEBPAY_VERSION,
  documentDate: "2026-07-14",
};

/** Seconds NewebPay keeps its payment page open (NewebPay's maximum). */
export const NEWEBPAY_TRADE_LIMIT_SECONDS = 900;

export type NewebPayEnv = "sandbox" | "production";

export interface NewebPayConfig {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  env: NewebPayEnv;
  appUrl: string;
  gatewayUrl: string;
}

export interface NewebPayForm {
  action: string;
  fields: Record<string, string>;
}

export interface ParsedNewebPayCallback {
  outerStatus: string;
  merchantId: string;
  version: string;
  tradeInfo: string;
  tradeSha: string;
  decoded: NewebPayDecoded;
}

export interface NewebPayDecoded {
  Status?: string;
  Message?: string;
  Result?: Record<string, unknown>;
  [key: string]: unknown;
}

const GATEWAYS: Record<NewebPayEnv, string> = {
  sandbox: "https://ccore.newebpay.com/MPG/mpg_gateway",
  production: "https://core.newebpay.com/MPG/mpg_gateway",
};

const CREDIT_CARD_CANCEL_ENDPOINTS: Record<NewebPayEnv, string> = {
  sandbox: "https://ccore.newebpay.com/API/CreditCard/Cancel",
  production: "https://core.newebpay.com/API/CreditCard/Cancel",
};

const QUERY_TRADE_INFO_ENDPOINTS: Record<NewebPayEnv, string> = {
  sandbox: "https://ccore.newebpay.com/API/QueryTradeInfo",
  production: "https://core.newebpay.com/API/QueryTradeInfo",
};

const CREDIT_CARD_CLOSE_ENDPOINTS: Record<NewebPayEnv, string> = {
  sandbox: "https://ccore.newebpay.com/API/CreditCard/Close",
  production: "https://core.newebpay.com/API/CreditCard/Close",
};

const SAFE_KEYS = new Set([
  "Amt",
  "BankCode",
  "Barcode_1",
  "Barcode_2",
  "Barcode_3",
  "CodeNo",
  "ExpireDate",
  "ExpireTime",
  "MerchantOrderNo",
  "PaymentMethod",
  "PaymentType",
  "TradeNo",
  "TradeStatus",
  "PayTime",
  "RespondCode",
]);

export class NewebPayConfigurationError extends Error {
  constructor(message = "payment_configuration_missing") {
    super(message);
    this.name = "NewebPayConfigurationError";
  }
}

export function getNewebPayConfig(): NewebPayConfig {
  const env = process.env.NEWEBPAY_ENV ?? "sandbox";
  if (env !== "sandbox" && env !== "production") {
    throw new NewebPayConfigurationError("payment_configuration_invalid");
  }

  const merchantId = process.env.NEWEBPAY_MERCHANT_ID ?? "";
  const hashKey = (process.env.NEWEBPAY_HASH_KEY ?? "").trim();
  const hashIv = (process.env.NEWEBPAY_HASH_IV ?? "").trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

  if (!merchantId || !hashKey || !hashIv || !appUrl) {
    throw new NewebPayConfigurationError();
  }
  if (Buffer.byteLength(hashKey, "utf8") !== 32 || Buffer.byteLength(hashIv, "utf8") !== 16) {
    throw new NewebPayConfigurationError("payment_configuration_invalid");
  }

  const parsedAppUrl = new URL(appUrl);
  if (parsedAppUrl.protocol !== "https:" && !parsedAppUrl.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
    throw new NewebPayConfigurationError("payment_configuration_invalid");
  }

  return {
    merchantId,
    hashKey,
    hashIv,
    env,
    appUrl: parsedAppUrl.origin,
    gatewayUrl: GATEWAYS[env],
  };
}

export function serializeTradeInfo(params: Record<string, string | number>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "" && value !== undefined && value !== null) {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

export function parseTradeInfo(value: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(value));
}

export function encryptTradeInfo(plainText: string, hashKey: string, hashIv: string): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIv, "utf8"),
  );
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]).toString("hex");
}

export function decryptTradeInfo(encryptedHex: string, hashKey: string, hashIv: string): string {
  if (!/^[0-9a-f]+$/i.test(encryptedHex) || encryptedHex.length % 2 !== 0) {
    throw new Error("payment_callback_invalid");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIv, "utf8"),
  );
  decipher.setAutoPadding(true);
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function createTradeSha(tradeInfo: string, hashKey: string, hashIv: string): string {
  return crypto
    .createHash("sha256")
    .update(`HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIv}`, "utf8")
    .digest("hex")
    .toUpperCase();
}

/** Build the encrypted NPA-B032 (credit-card refund) request.  This is a
 * separate API from MPG: its outer field names intentionally end in `_`. */
export function buildCreditCardRefundRequest(input: {
  config: NewebPayConfig;
  merchantOrderNo: string;
  amount: number;
  now?: Date;
}): NewebPayForm {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("payment_invalid_amount");
  }
  if (!input.merchantOrderNo) {
    throw new Error("payment_refund_missing_reference");
  }

  const timeStamp = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const version = "1.1";
  const postData = encryptTradeInfo(
    serializeTradeInfo({
      RespondType: "JSON",
      Version: version,
      Amt: input.amount,
      MerchantOrderNo: input.merchantOrderNo,
      TimeStamp: timeStamp,
      IndexType: 1,
      CloseType: 2,
    }),
    input.config.hashKey,
    input.config.hashIv,
  );

  return {
    action: CREDIT_CARD_CLOSE_ENDPOINTS[input.config.env],
    fields: {
      MerchantID_: input.config.merchantId,
      PostData_: postData,
    },
  };
}

/** Build the encrypted NPA-B01 cancel-authorization (void) request: returns a
 *  card charge NewebPay hasn't captured yet, which a refund can't touch.
 *  Same `MerchantID_` / `PostData_` envelope as the refund. */
export function buildCreditCardCancelAuthRequest(input: {
  config: NewebPayConfig;
  merchantOrderNo: string;
  tradeNo: string | null;
  amount: number;
  now?: Date;
}): NewebPayForm {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("payment_invalid_amount");
  }
  if (!input.merchantOrderNo) {
    throw new Error("payment_refund_missing_reference");
  }

  const postData = encryptTradeInfo(
    serializeTradeInfo({
      RespondType: "JSON",
      Version: "1.0",
      Amt: input.amount,
      MerchantOrderNo: input.merchantOrderNo,
      TradeNo: input.tradeNo ?? "",
      IndexType: 1,
      TimeStamp: Math.floor((input.now ?? new Date()).getTime() / 1000),
    }),
    input.config.hashKey,
    input.config.hashIv,
  );

  return {
    action: CREDIT_CARD_CANCEL_ENDPOINTS[input.config.env],
    fields: {
      MerchantID_: input.config.merchantId,
      PostData_: postData,
    },
  };
}

/** Build a read-only QueryTradeInfo lookup (capture / refund state of an
 *  order). Signed with CheckValue = SHA-256 of IV, the sorted fields and Key. */
export function buildTradeInfoQuery(input: {
  config: NewebPayConfig;
  merchantOrderNo: string;
  amount: number;
  now?: Date;
}): NewebPayForm {
  const { merchantId, hashKey, hashIv } = input.config;
  const checkValue = crypto
    .createHash("sha256")
    .update(
      `IV=${hashIv}&Amt=${input.amount}&MerchantID=${merchantId}&MerchantOrderNo=${input.merchantOrderNo}&Key=${hashKey}`,
      "utf8",
    )
    .digest("hex")
    .toUpperCase();

  return {
    action: QUERY_TRADE_INFO_ENDPOINTS[input.config.env],
    fields: {
      MerchantID: merchantId,
      Version: "1.3",
      RespondType: "JSON",
      CheckValue: checkValue,
      TimeStamp: String(Math.floor((input.now ?? new Date()).getTime() / 1000)),
      MerchantOrderNo: input.merchantOrderNo,
      Amt: String(input.amount),
    },
  };
}

export function verifyTradeSha(
  tradeInfo: string,
  tradeSha: string,
  hashKey: string,
  hashIv: string,
): boolean {
  const expected = createTradeSha(tradeInfo, hashKey, hashIv);
  const received = tradeSha.toUpperCase();
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function createMerchantOrderNo(now = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/\D/g, "")
    .slice(2, 14);
  const suffix = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `PG${stamp}${suffix}`;
}

export function buildPaymentForm(input: {
  config: NewebPayConfig;
  merchantOrderNo: string;
  amount: number;
  itemDesc: string;
  email?: string | null;
  locale: "zh" | "en";
}): NewebPayForm {
  const params: Record<string, string | number> = {
    MerchantID: input.config.merchantId,
    RespondType: "JSON",
    TimeStamp: Math.floor(Date.now() / 1000),
    Version: NEWEBPAY_VERSION,
    MerchantOrderNo: input.merchantOrderNo,
    Amt: input.amount,
    ItemDesc: sanitizeItemDesc(input.itemDesc),
    ReturnURL: `${input.config.appUrl}/api/payments/newebpay/return`,
    NotifyURL: `${input.config.appUrl}/api/payments/newebpay/notify`,
    ClientBackURL: `${input.config.appUrl}/payments/newebpay/result`,
    // NewebPay closes its payment page after this many seconds (max 900). The
    // database lets the member start a new attempt 20 minutes after this one
    // began (payment_attempt_deadline), once the old page can no longer pay.
    TradeLimit: NEWEBPAY_TRADE_LIMIT_SECONDS,
    LoginType: "0",
    LangType: input.locale === "zh" ? "zh-tw" : "en",
  };
  if (input.email) params.Email = input.email.slice(0, 50);

  const tradeInfo = encryptTradeInfo(
    serializeTradeInfo(params),
    input.config.hashKey,
    input.config.hashIv,
  );

  return {
    action: input.config.gatewayUrl,
    fields: {
      MerchantID: input.config.merchantId,
      TradeInfo: tradeInfo,
      TradeSha: createTradeSha(tradeInfo, input.config.hashKey, input.config.hashIv),
      Version: NEWEBPAY_VERSION,
      EncryptType: "0",
    },
  };
}

export function sanitizeItemDesc(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50) || "PacerGo booking";
}

/**
 * Read a NewebPay callback body. The browser `return` posts a normal form, but
 * NewebPay's server-to-server `notify` isn't reliably labelled
 * `application/x-www-form-urlencoded`, so the body is parsed whatever the
 * content type: multipart form, URL-encoded string, or JSON.
 */
export async function parseNewebPayFormData(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  let get: (key: string) => string;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    get = (key) => String(form.get(key) ?? "");
  } else {
    const raw = (await request.text()).trim();
    if (raw.startsWith("{")) {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new Error("payment_callback_invalid");
      }
      get = (key) => String(body[key] ?? "");
    } else {
      const params = new URLSearchParams(raw);
      get = (key) => params.get(key) ?? "";
    }
  }
  const fields = {
    Status: get("Status"),
    MerchantID: get("MerchantID"),
    TradeInfo: get("TradeInfo"),
    TradeSha: get("TradeSha"),
    Version: get("Version"),
  };
  if (!fields.TradeInfo || !fields.TradeSha) throw new Error("payment_callback_invalid");
  return fields;
}

export function verifyAndDecodeCallback(
  fields: Record<string, string>,
  config: NewebPayConfig,
): ParsedNewebPayCallback {
  const tradeInfo = fields.TradeInfo;
  const tradeSha = fields.TradeSha;
  if (!fields.MerchantID || fields.MerchantID !== config.merchantId) {
    throw new Error("payment_merchant_mismatch");
  }
  if (!tradeInfo || !tradeSha || !verifyTradeSha(tradeInfo, tradeSha, config.hashKey, config.hashIv)) {
    throw new Error("payment_signature_invalid");
  }

  const plain = decryptTradeInfo(tradeInfo, config.hashKey, config.hashIv);
  const decoded = parseDecodedTradeInfo(plain);
  const result = getCallbackResult(decoded);
  if (String(result.MerchantID ?? fields.MerchantID) !== config.merchantId) {
    throw new Error("payment_merchant_mismatch");
  }

  return {
    outerStatus: fields.Status,
    merchantId: fields.MerchantID,
    version: fields.Version,
    tradeInfo,
    tradeSha,
    decoded,
  };
}

export function parseDecodedTradeInfo(plain: string): NewebPayDecoded {
  const trimmed = plain.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as NewebPayDecoded;
  }
  return parseTradeInfo(trimmed) as NewebPayDecoded;
}

export function getCallbackResult(decoded: NewebPayDecoded): Record<string, unknown> {
  const result = decoded.Result;
  return result && typeof result === "object" ? result : decoded;
}

export function getMerchantOrderNo(decoded: NewebPayDecoded): string {
  const result = getCallbackResult(decoded);
  return String(result.MerchantOrderNo ?? "");
}

export function getAmount(decoded: NewebPayDecoded): number {
  const result = getCallbackResult(decoded);
  const amount = Number(result.Amt ?? 0);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("payment_invalid_amount");
  return amount;
}

export function mapProviderStatus(decoded: NewebPayDecoded): "paid" | "awaiting_payment" | "failed" | "expired" | "processing" {
  const status = String(decoded.Status ?? "");
  const result = getCallbackResult(decoded);
  const paymentMethod = String(result.PaymentMethod ?? result.PaymentType ?? "");
  const hasPayTime = Boolean(result.PayTime);
  const tradeStatus = String(result.TradeStatus ?? "");

  if (status !== "SUCCESS") return status === "MPG03009" ? "expired" : "failed";
  if (tradeStatus === "1" || hasPayTime) return "paid";
  if (["VACC", "CVS", "BARCODE"].includes(paymentMethod)) return "awaiting_payment";
  return "processing";
}

export function getSafeProviderValues(decoded: NewebPayDecoded) {
  const result = getCallbackResult(decoded);
  const instructions: Record<string, string> = {};
  for (const key of SAFE_KEYS) {
    const value = result[key];
    if (value !== undefined && value !== null && value !== "") {
      instructions[key] = String(value).slice(0, 200);
    }
  }

  return {
    merchantOrderNo: String(result.MerchantOrderNo ?? ""),
    providerTradeNo: String(result.TradeNo ?? ""),
    providerStatus: String(result.TradeStatus ?? decoded.Status ?? ""),
    paymentMethod: String(result.PaymentMethod ?? result.PaymentType ?? ""),
    responseCode: String(result.RespondCode ?? decoded.Status ?? ""),
    responseMessage: String(decoded.Message ?? "").slice(0, 200),
    instructions,
  };
}
