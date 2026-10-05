import type { StatusTone } from "@/shared/components/atoms/status-badge";
import type { AdminOrderRow } from "@/lib/admin";
import { correctServiceCompleted, setPaymentHold, setPaymentStatus } from "../admin-actions";

/** What an admin can record on an order's ledger. None of these call a payment
 *  provider — they only update the order record. */
export type OrderAction =
  | "refund_requested"
  | "refunded"
  | "hold"
  | "release"
  | "complete"
  | "revert"
  | "cancel";

/** The slice of an order the rules below need (an order row has all of it). */
export type OrderState = Pick<
  AdminOrderRow,
  "status" | "refund_status" | "settlement_status" | "admin_hold"
>;

/** Which actions apply to an order, in menu order. `serviceDone` is whether the
 *  service is marked completed — it is only known once the order's detail has
 *  loaded, so the service action is left out until then (`null`). */
export function availableActions(order: OrderState, serviceDone: boolean | null): OrderAction[] {
  const settled = order.settlement_status === "paid";
  const actions: OrderAction[] = [];
  if (order.status === "paid" && order.refund_status === "none" && !settled) {
    actions.push("refund_requested");
  }
  if (order.refund_status === "refund_requested") actions.push("refunded");
  if (!settled) actions.push(order.admin_hold ? "release" : "hold");
  if (order.status === "paid" && !settled && serviceDone !== null) {
    actions.push(serviceDone ? "revert" : "complete");
  }
  if (order.status !== "cancelled" && order.status !== "paid") actions.push("cancel");
  return actions;
}

/** Record `action` on order `id` with the admin's reason (the server requires one). */
export async function performOrderAction(
  id: string,
  action: OrderAction,
  reason: string,
): Promise<void> {
  switch (action) {
    case "refund_requested":
    case "refunded":
    case "cancel":
      return setPaymentStatus(id, action, reason);
    case "hold":
      return setPaymentHold(id, true, reason);
    case "release":
      return setPaymentHold(id, false, reason);
    case "complete":
      return correctServiceCompleted(id, true, reason);
    case "revert":
      return correctServiceCompleted(id, false, reason);
  }
}

/** Translation key (under `orders.action`) for an action's label. */
export function actionLabelKey(action: OrderAction): string {
  if (action === "complete") return "orders.action.completeService";
  if (action === "revert") return "orders.action.revertService";
  return `orders.action.${action}`;
}

const PAYMENT_TONE: Record<string, StatusTone> = {
  paid: "success",
  created: "warning",
  redirected: "warning",
  processing: "warning",
  awaiting_payment: "warning",
  failed: "danger",
  expired: "danger",
  cancelled: "muted",
};

/** The single status pill an order shows: a refund (requested / done) takes
 *  priority over a hold, which takes priority over the payment status — so a
 *  refunded order doesn't also say "Paid". */
export function orderBadge(order: Pick<AdminOrderRow, "status" | "refund_status" | "admin_hold">): {
  tone: StatusTone;
  labelKey: string;
} {
  if (order.refund_status !== "none") {
    return { tone: refundTone(order.refund_status), labelKey: `orders.refund.${order.refund_status}` };
  }
  if (order.admin_hold) return { tone: "danger", labelKey: "orders.filter.on_hold" };
  return { tone: paymentTone(order.status), labelKey: `orders.status.${order.status}` };
}

/** Colour of a payment status pill. */
export function paymentTone(status: string): StatusTone {
  return PAYMENT_TONE[status] ?? "muted";
}

/** Colour of a refund status pill. */
export function refundTone(status: string): StatusTone {
  return status === "refunded" ? "info" : "warning";
}
