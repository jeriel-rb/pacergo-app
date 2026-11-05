"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BookingRole } from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { PlanMarkdown } from "@/features/ai-plan/plan-markdown";
import { useLocale } from "@/shared/hooks/use-locale";
import { BOOKING_TERMS_VERSION, bookingTermsKeys } from "@/lib/booking-terms";
import { acceptBookingTerms } from "@/features/booking/booking-actions";

/** Booking safety terms popup, shared by the trainer's Accept and the member's
 *  Pay. Shows the role's general terms plus the booking's activity section in a
 *  scroll box, with one required checkbox. Agreeing saves the record first
 *  (accept_booking_terms), then closes and hands over to `onAgreed`, which runs
 *  the actual accept or checkout. */
export function BookingTermsDialog({
  open,
  onOpenChange,
  bookingId,
  role,
  activitySlug,
  onAgreed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  role: BookingRole;
  activitySlug: string | null | undefined;
  onAgreed: () => void;
}) {
  const { t } = useTranslation("legal");
  const locale = useLocale();
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = bookingTermsKeys(role, activitySlug);

  // Every opening asks again: the tick is for this accept or this payment.
  useEffect(() => {
    if (open) {
      setChecked(false);
      setError(null);
    }
  }, [open]);

  async function agree() {
    setSaving(true);
    setError(null);
    try {
      await acceptBookingTerms(bookingId, locale);
    } catch {
      setError(t("bookingTerms.dialog.saveFailed"));
      setSaving(false);
      return;
    }
    setSaving(false);
    onOpenChange(false);
    onAgreed();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader className="pr-6">
          <DialogTitle>{t(`bookingTerms.dialog.title.${role}`)}</DialogTitle>
          <DialogDescription>{t(`bookingTerms.dialog.description.${role}`)}</DialogDescription>
        </DialogHeader>

        <section
          tabIndex={0}
          aria-label={t(keys.title)}
          className="max-h-[50vh] overflow-y-auto rounded-xl border border-border bg-muted/30 px-4 pb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3 className="pt-4 text-sm font-bold">{t(keys.title)}</h3>
          <PlanMarkdown markdown={t(keys.body)} />
          {keys.activityTitle && keys.activityBody && (
            <>
              <h3 className="mt-5 border-t border-border pt-4 text-sm font-bold">
                {t(keys.activityTitle)}
              </h3>
              <PlanMarkdown markdown={t(keys.activityBody)} />
            </>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          {t("bookingTerms.dialog.version", { version: BOOKING_TERMS_VERSION })}
          {" · "}
          {t("bookingTerms.dialog.record")}
        </p>

        <label htmlFor={checkboxId} className="flex items-center gap-2 text-sm font-medium">
          <Checkbox id={checkboxId} checked={checked} onChange={setChecked} disabled={saving} />
          <span>{t("bookingTerms.dialog.agree")}</span>
        </label>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("bookingTerms.dialog.back")}
          </Button>
          <Button type="button" disabled={!checked || saving} onClick={() => void agree()}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {t(`bookingTerms.dialog.confirm.${role}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
