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
import {
  acceptBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
} from "./booking-actions";

type Action = {
  key: BookingAction;
  run: (id: string) => Promise<void>;
  variant?: "default" | "outline";
};

/** How each FSM action runs + renders; the FSM itself is shared with mobile. */
const ACTION_META: Record<BookingAction, Omit<Action, "key">> = {
  accept: { run: acceptBooking },
  decline: { run: declineBooking, variant: "outline" },
  cancel: { run: cancelBooking, variant: "outline" },
  complete: { run: completeBooking },
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

  const actions: Action[] = availableActions(
    booking.status,
    iAmCompanion ? "companion" : "seeker",
  ).map((key) => ({ key, ...ACTION_META[key] }));

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
    return error ? <p className="text-sm text-destructive">{error}</p> : null;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={a.variant ?? "default"}
            disabled={busy}
            onClick={() => dispatch(a)}
            className="flex-1 gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {t(`actions.${a.key}`)}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
