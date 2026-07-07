"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  ACTIVITY_META,
  BOOKING_TIME_SLOTS,
  TIER_LABELS,
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
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { PriceTag } from "@/shared/components/atoms/price-tag";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { createBooking } from "./booking-actions";

/** Booking request form (modal). Triggered from the trainer detail CTA. */
export function BookingSheet({
  companionId,
  companionName,
  offerings,
  trigger,
}: {
  companionId: string;
  companionName: string;
  offerings: CompanionOffering[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { t } = useTranslation("sessions");

  const [open, setOpen] = useState(false);
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = offerings.find((o) => o.id === offeringId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offeringId) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await createBooking({
        companionId,
        offeringId,
        scheduledStart:
          date && time ? new Date(`${date}T${time}`).toISOString() : null,
        durationMin: selected?.session_minutes ?? null,
        locationName: location.trim() || null,
        seekerNote: note.trim() || null,
      });
      setOpen(false);
      router.push(getLocalizedPath(`/sessions/${id}`, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
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
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("book.offering")}</span>
            <div className="space-y-2">
              {offerings.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOfferingId(o.id)}
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

          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("book.when")}</span>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label={t("book.whenDate")}
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Select
                aria-label={t("book.whenTime")}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!date}
              >
                <option value="">{t("book.whenTime")}</option>
                {BOOKING_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("book.whenHint")}
            </p>
          </div>

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
