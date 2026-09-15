/**
 * Admin CSV export definitions (B-9 / A9). Each definition pairs a resource
 * name + filename with the exact column set the spec requires. Row accessors
 * receive the jsonb objects returned by the `admin_export_*` RPCs and MUST mask
 * any sensitive field here (bank accounts) so the serializer never sees raw
 * values — this is the enforced choke point for the "no full bank numbers" rule.
 *
 * Column sets mirror §5.2 B-9 verbatim:
 *  - Users
 *  - Trainers
 *  - Bookings/orders: gross amount, platform-fee rate/amount,
 *    processing-fee rate/amount, trainer payable, payment status, refund
 *    status, service-completion status, settlement-eligibility status,
 *    settlement status
 *  - Withdrawal requests (masked account numbers)
 */

import { maskBankAccount } from "./mask";
import type { CsvExport } from "./csv";

export type UnknownRow = Record<string, unknown>;

/* ---- row shapes (mirror admin_export_* RPC jsonb) ---- */

export interface UserExportRow {
  [key: string]: unknown;
  id: unknown;
  display_name: unknown;
  home_area: unknown;
  experience_level: unknown;
  is_companion: unknown;
  is_admin: unknown;
  created_at: unknown;
}

export interface TrainerExportRow {
  [key: string]: unknown;
  id: unknown;
  display_name: unknown;
  home_area: unknown;
  experience_level: unknown;
  tier: unknown;
  price_ntd: unknown;
  is_free: unknown;
  rating_avg: unknown;
  rating_count: unknown;
  is_companion: unknown;
  created_at: unknown;
}

export interface OrderExportRow {
  [key: string]: unknown;
  booking_id: unknown;
  seeker_id: unknown;
  seeker_name: unknown;
  companion_id: unknown;
  companion_name: unknown;
  activity_slug: unknown;
  tier: unknown;
  scheduled_start: unknown;
  duration_min: unknown;
  location_name: unknown;
  agreed_price: unknown;
  is_free: unknown;
  payment_id: unknown;
  merchant_order_no: unknown;
  provider_trade_no: unknown;
  provider: unknown;
  provider_type: unknown;
  gross_amount: unknown;
  platform_fee_rate: unknown;
  platform_fee_amount: unknown;
  processing_fee_rate: unknown;
  processing_fee_amount: unknown;
  trainer_payable: unknown;
  payment_status: unknown;
  refund_status: unknown;
  service_completed_at: unknown;
  settlement_hold_until: unknown;
  settlement_eligibility_status: unknown;
  settlement_status: unknown;
  paid_at: unknown;
  failed_at: unknown;
  expired_at: unknown;
  created_at: unknown;
}

export interface WithdrawalExportRow {
  [key: string]: unknown;
  id: unknown;
  trainer_id: unknown;
  trainer_name: unknown;
  amount: unknown;
  /** Already masked by the RPC; re-masked here as defense in depth. */
  bank_account_mask: unknown;
  status: unknown;
  reason_note: unknown;
  requested_at: unknown;
  updated_at: unknown;
  settled_at: unknown;
}

/* ---- helpers ---- */

const text = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

const num = (v: unknown): number =>
  v === null || v === undefined ? 0 : Number(v);

/**
 * Excel-friendly UTC timestamp: `YYYY-MM-DD HH:mm:ss` (empty if missing/invalid).
 *
 * Wrapped as an `="..."` text-literal formula so Excel renders it as plain
 * text instead of auto-detecting a date/number and right-aligning it into a
 * column too narrow to show — which displays as `####` — and instead of
 * silently reinterpreting it under the viewer's regional date format.
 */
function dateTime(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const d = v instanceof Date ? v : new Date(String(v));
  const formatted = Number.isNaN(d.getTime())
    ? text(v)
    : d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
  return excelTextLiteral(formatted);
}

/** Force Excel to treat a CSV field as literal text via an `="..."` formula. */
function excelTextLiteral(value: string): string {
  if (value === "") return "";
  return `="${value.replace(/"/g, '""')}"`;
}

/* ---- export definitions ---- */

export const USERS_EXPORT: CsvExport<UnknownRow> = {
  resource: "users",
  filename: (now) => `pacergo-users-${fmtDate(now)}`,
  columns: [
    { header: "Display Name", cell: (r) => text(r.display_name) },
    { header: "Home Area", cell: (r) => text(r.home_area) },
    { header: "Experience Level", cell: (r) => text(r.experience_level) },
    { header: "Is Companion", cell: (r) => text(r.is_companion) },
    { header: "Is Admin", cell: (r) => text(r.is_admin) },
    { header: "Created At", cell: (r) => dateTime(r.created_at) },
  ],
};

export const TRAINERS_EXPORT: CsvExport<UnknownRow> = {
  resource: "trainers",
  filename: (now) => `pacergo-trainers-${fmtDate(now)}`,
  columns: [
    { header: "Display Name", cell: (r) => text(r.display_name) },
    { header: "Home Area", cell: (r) => text(r.home_area) },
    { header: "Experience Level", cell: (r) => text(r.experience_level) },
    { header: "Tier", cell: (r) => text(r.tier) },
    { header: "Price NTD", cell: (r) => num(r.price_ntd) },
    { header: "Free", cell: (r) => text(r.is_free) },
    { header: "Rating Avg", cell: (r) => num(r.rating_avg) },
    { header: "Rating Count", cell: (r) => num(r.rating_count) },
    { header: "Is Companion", cell: (r) => text(r.is_companion) },
    { header: "Created At", cell: (r) => dateTime(r.created_at) },
  ],
};

export const ORDERS_EXPORT: CsvExport<UnknownRow> = {
  resource: "orders",
  filename: (now) => `pacergo-orders-${fmtDate(now)}`,
  columns: [
    { header: "Created At", cell: (r) => dateTime(r.created_at) },
    { header: "Paid At", cell: (r) => dateTime(r.paid_at) },
    { header: "Seeker Name", cell: (r) => text(r.seeker_name) },
    { header: "Trainer Name", cell: (r) => text(r.companion_name) },
    { header: "Activity", cell: (r) => text(r.activity_slug) },
    { header: "Tier", cell: (r) => text(r.tier) },
    { header: "Scheduled Start", cell: (r) => dateTime(r.scheduled_start) },
    { header: "Duration (min)", cell: (r) => num(r.duration_min) },
    { header: "Location", cell: (r) => text(r.location_name) },
    { header: "Agreed Price", cell: (r) => num(r.agreed_price) },
    { header: "Free", cell: (r) => text(r.is_free) },
    { header: "Merchant Order No", cell: (r) => text(r.merchant_order_no) },
    { header: "Provider Trade No", cell: (r) => text(r.provider_trade_no) },
    { header: "Provider", cell: (r) => text(r.provider) },
    { header: "Provider Type", cell: (r) => text(r.provider_type) },
    { header: "Gross Amount", cell: (r) => num(r.gross_amount) },
    { header: "Platform Fee Rate", cell: (r) => num(r.platform_fee_rate) },
    { header: "Platform Fee Amount", cell: (r) => num(r.platform_fee_amount) },
    { header: "Processing Fee Rate", cell: (r) => num(r.processing_fee_rate) },
    {
      header: "Processing Fee Amount",
      cell: (r) => num(r.processing_fee_amount),
    },
    { header: "Trainer Payable", cell: (r) => num(r.trainer_payable) },
    { header: "Payment Status", cell: (r) => text(r.payment_status) },
    { header: "Refund Status", cell: (r) => text(r.refund_status) },
    {
      header: "Service Completed At",
      cell: (r) => dateTime(r.service_completed_at),
    },
    {
      header: "Settlement Hold Until",
      cell: (r) => dateTime(r.settlement_hold_until),
    },
    {
      header: "Settlement Eligibility",
      cell: (r) => text(r.settlement_eligibility_status),
    },
    { header: "Settlement Status", cell: (r) => text(r.settlement_status) },
    { header: "Failed At", cell: (r) => dateTime(r.failed_at) },
    { header: "Expired At", cell: (r) => dateTime(r.expired_at) },
  ],
};

export const WITHDRAWALS_EXPORT: CsvExport<UnknownRow> = {
  resource: "withdrawals",
  filename: (now) => `pacergo-withdrawals-${fmtDate(now)}`,
  columns: [
    { header: "Requested At", cell: (r) => dateTime(r.requested_at) },
    { header: "Settled At", cell: (r) => dateTime(r.settled_at) },
    { header: "Updated At", cell: (r) => dateTime(r.updated_at) },
    { header: "Trainer Name", cell: (r) => text(r.trainer_name) },
    { header: "Amount", cell: (r) => num(r.amount) },
    {
      header: "Bank Account (masked)",
      cell: (r) => maskBankAccount(text(r.bank_account_mask)),
    },
    { header: "Status", cell: (r) => text(r.status) },
    { header: "Reason Note", cell: (r) => text(r.reason_note) },
  ],
};

export type AdminExportResource =
  "users" | "trainers" | "orders" | "withdrawals";

export const ADMIN_EXPORTS: Record<
  AdminExportResource,
  CsvExport<UnknownRow>
> = {
  users: USERS_EXPORT,
  trainers: TRAINERS_EXPORT,
  orders: ORDERS_EXPORT,
  withdrawals: WITHDRAWALS_EXPORT,
};

export function getAdminExport(resource: string): CsvExport<UnknownRow> | null {
  const def = (ADMIN_EXPORTS as Record<string, CsvExport<UnknownRow>>)[
    resource
  ];
  return def ?? null;
}

function fmtDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}
