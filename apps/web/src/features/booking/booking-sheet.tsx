"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  ACTIVITY_META,
  TIER_LABELS,
  bookableStartTimes,
  calendarDayKeyFromLocalDate,
  wallTimeToUtcIso,
  type AvailabilitySlot,
  type CompanionOffering,
} from "@pacergo/shared";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { RatingButton } from "@/features/trainer/rating-dialog";
import { useLocale } from "@/shared/hooks/use-locale";
import {
  getCurrentLocale,
  getLocalizedPath,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/toast";
import { createBooking } from "./booking-actions";
import { BookingWhenField } from "./booking-when-field";

/** Booking request form (modal). Triggered from the trainer detail CTA. */
export function BookingSheet({
  companionId,
  companionName,
  offerings,
  availability,
  rating,
  trigger,
}: {
  companionId: string;
  companionName: string;
  offerings: CompanionOffering[];
  /** The trainer's weekly windows (Taipei); only these days/times can be picked. */
  availability: AvailabilitySlot[];
  /** Trainer rating shown in the header; click opens the reviews dialog. */
  rating?: { avg: number; count: number };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const routeLocale = getCurrentLocale(pathname);
  const locale = useLocale();
  const { t } = useTranslation("sessions");
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = offerings.find((o) => o.id === offeringId);
  const sessionMinutes = selected?.session_minutes ?? 60;

  // A longer plan may no longer fit the picked day / start time: drop what doesn't.
  function selectOffering(o: CompanionOffering) {
    setOfferingId(o.id);
    if (!date) return;
    const times = bookableStartTimes({
      availability,
      dateKey: calendarDayKeyFromLocalDate(date),
      sessionMinutes: o.session_minutes ?? 60,
    });
    if (times.length === 0) setDate(undefined);
    if (!times.includes(time)) setTime("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offeringId) return;
    setSubmitting(true);
    setError(null);
    try {
      const dateKey = date ? calendarDayKeyFromLocalDate(date) : "";
      const id = await createBooking({
        companionId,
        offeringId,
        scheduledStart:
          dateKey && time ? wallTimeToUtcIso(dateKey, time) : null,
        durationMin: sessionMinutes,
        locationName: location.trim() || null,
        seekerNote: note.trim() || null,
      });
      setOpen(false);
      toast.show(t("toast.requestSent"), "success");
      // URL locale (pathname), not i18n language — keeps nav consistent after switch.
      router.push(getLocalizedPath(`/sessions/${id}`, routeLocale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      toast.show(t("toast.requestFailed"), "destructive");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("book.title")}</DialogTitle>
          <DialogDescription>
            {t("book.subtitle", { name: companionName })}
          </DialogDescription>
          {rating && (
            <RatingButton
              trainerId={companionId}
              trainerName={companionName}
              ratingAvg={rating.avg}
              ratingCount={rating.count}
            />
          )}
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("book.offering")}</span>
            <div className="space-y-2">
              {offerings.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOffering(o)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    offeringId === o.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {ACTIVITY_META[o.activity][locale]}
                    </span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {TIER_LABELS[o.tier][locale]} · {o.session_minutes}
                      {locale === "zh" ? " 分鐘" : " min"}
                    </span>
                  </span>
                  <PriceTag
                    amount={o.price_ntd}
                    isFree={o.is_free}
                    perHour
                    locale={locale}
                    className="shrink-0 text-sm"
                  />
                </button>
              ))}
            </div>
          </div>

          <BookingWhenField
            availability={availability}
            sessionMinutes={sessionMinutes}
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />

          <Input
            label={t("book.location")}
            placeholder={t("book.locationPlaceholder")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
          />

          <Textarea
            label={t("book.note")}
            placeholder={t("book.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={submitting || !offeringId}
            className="w-full gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {t("book.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
