"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MyReview } from "@/lib/reviews";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { SaveButton } from "@/shared/components/atoms/save-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/toast";
import { submitReview } from "./review-actions";

/** Review affordance on a completed booking. Only the trainee reviews the trainer. */
export function ReviewSection({
  bookingId,
  myReview,
  inline = false,
}: {
  bookingId: string;
  myReview: MyReview | null;
  inline?: boolean;
}) {
  const { t } = useTranslation("sessions");

  if (myReview) {
    return (
      <Card className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("review.your")}</p>
          <ReviewDialog
            bookingId={bookingId}
            initial={myReview}
            trigger={
              <button
                type="button"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                {t("review.edit")}
              </button>
            }
          />
        </div>
        <Stars value={myReview.rating} />
        {myReview.comment && (
          <p className="text-sm text-foreground/80">{myReview.comment}</p>
        )}
      </Card>
    );
  }

  return (
    <ReviewDialog
      bookingId={bookingId}
      trigger={
        <Button
          className={cn(
            "min-h-10 min-w-0 gap-2 whitespace-normal px-2 text-center text-xs sm:px-4 sm:text-sm",
            inline ? "flex-1" : "w-full",
          )}
        >
          <Star size={16} />
          {t("review.leave")}
        </Button>
      }
    />
  );
}

function ReviewDialog({
  bookingId,
  initial,
  trigger,
}: {
  bookingId: string;
  initial?: MyReview;
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation("sessions");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Compared with the saved review (`initial` is refreshed after a save) rather than a
  // first-render baseline, since the fields re-sync every time the dialog opens.
  // A brand-new review has nothing saved yet, so it can always be submitted.
  const dirty =
    !initial || rating !== initial.rating || comment.trim() !== (initial.comment ?? "").trim();

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await submitReview(bookingId, rating, comment.trim() || null);
      setOpen(false);
      toast.show(t("toast.reviewSubmitted"), "success");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      toast.show(t("toast.reviewFailed"), "destructive");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setRating(initial?.rating ?? 5);
          setComment(initial?.comment ?? "");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("review.title")}</DialogTitle>
          <DialogDescription>{t("review.desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n}`}
              onClick={() => setRating(n)}
            >
              <Star
                size={32}
                className={cn(
                  "transition-colors",
                  n <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30",
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          label={t("review.comment")}
          placeholder={t("review.commentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <SaveButton
          onClick={save}
          dirty={dirty}
          saving={saving}
          className="w-full"
          label={t("review.submit")}
        />
      </DialogContent>
    </Dialog>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={cn(
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
