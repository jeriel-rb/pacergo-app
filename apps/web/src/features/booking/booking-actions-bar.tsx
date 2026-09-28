"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  availableActions,
  type BookingAction,
  type BookingRecord,
} from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  acceptBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
} from "./booking-actions";

type Action = {
  key: BookingAction;
  run: (id: string) => Promise<void>;
  variant?: "default" | "outline" | "destructive";
  /** Extra classes for actions with no dedicated variant (e.g. a green
   *  "complete" affirmative, distinct from the neutral default). */
  className?: string;
};

/** How each FSM action runs + renders; the FSM itself is shared with mobile.
 *  Cancel/decline are destructive (red); complete is an affirmative green,
 *  distinct from the neutral primary color used for accept. */
const ACTION_META: Record<BookingAction, Omit<Action, "key">> = {
  accept: { run: acceptBooking },
  decline: { run: declineBooking, variant: "destructive" },
  cancel: { run: cancelBooking, variant: "destructive" },
  complete: {
    run: completeBooking,
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
};

/** Role + status aware booking actions (accept/decline/cancel/complete). */
export function BookingActionsBar({
  booking,
  currentUserId,
}: {
  booking: BookingRecord;
  currentUserId: string | null;
}) {
  const { t } = useTranslation("sessions");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iAmCompanion = currentUserId === booking.companion_id;

  const actionOrder: BookingAction[] = ["cancel", "accept", "decline", "complete"];
  const actions: Action[] = availableActions(
    booking.status,
    iAmCompanion ? "companion" : "seeker",
  )
    .map((key) => ({ key, ...ACTION_META[key] }))
    .sort((a, b) => actionOrder.indexOf(a.key) - actionOrder.indexOf(b.key));

  async function dispatch(action: Action) {
    setBusy(true);
    setError(null);
    try {
      await action.run(booking.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (actions.length === 0) {
    return error ? (
      <p className="basis-full text-sm text-destructive">{error}</p>
    ) : null;
  }

  return (
    <>
      {actions.map((a) => (
        <Button
          key={a.key}
          variant={a.variant ?? "default"}
          disabled={busy}
          onClick={() => dispatch(a)}
          className={cn(
            "min-h-10 min-w-0 flex-1 whitespace-normal px-2 text-center text-xs sm:px-4 sm:text-sm",
            a.className,
          )}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {t(`actions.${a.key}`)}
        </Button>
      ))}
      {error && <p className="basis-full text-sm text-destructive">{error}</p>}
    </>
  );
}
