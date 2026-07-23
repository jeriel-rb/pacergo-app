import crypto from "node:crypto";

export const NEWEBPAY_VERSION = "2.3";
export const NEWEBPAY_SPEC = {
  name: "線上交易─幕前支付技術串接手冊_NDNF-1.2.3",
  documentVersion: "NDNF-1.2.3",
  apiVersion: NEWEBPAY_VERSION,
  documentDate: "2026-07-14",
};

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
  fields: {
    MerchantID: string;
    TradeInfo: string;
    TradeSha: string;
    Version: string;
  };
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
  const hashKey = process.env.NEWEBPAY_HASH_KEY ?? "";
  const hashIv = process.env.NEWEBPAY_HASH_IV ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

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

export async function parseNewebPayFormData(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    throw new Error("payment_callback_invalid");
  }
  const form = await request.formData();
  return {
    Status: String(form.get("Status") ?? ""),
    MerchantID: String(form.get("MerchantID") ?? ""),
    TradeInfo: String(form.get("TradeInfo") ?? ""),
    TradeSha: String(form.get("TradeSha") ?? ""),
    Version: String(form.get("Version") ?? ""),
  };
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
