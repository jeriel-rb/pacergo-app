"use client";

import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { REVIEW_PAGE_SIZE, type Review } from "@pacergo/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RatingStars } from "@/shared/components/atoms/rating-stars";
import { useLocale } from "@/shared/hooks/use-locale";
import { fetchCompanionReviewPage } from "./review-actions";

/** Controlled dialog listing a trainer's reviews (1–5 stars + comment).
 *  Controlled on purpose: the trainer card renders it outside its <Link>, since
 *  React events from a portal would otherwise bubble into the link and navigate. */
export function RatingDialog({
  open,
  onOpenChange,
  trainerId,
  trainerName,
  ratingAvg,
  ratingCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  trainerName: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<number | null>(null);

  async function loadMore(offset: number) {
    setLoading(true);
    setFailed(false);
    try {
      const next = await fetchCompanionReviewPage(trainerId, offset);
      setReviews((current) => [...current, ...next]);
      if (next.length < REVIEW_PAGE_SIZE) setExhausted(true);
      setLoaded(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // Fetch the first page lazily, the first time the dialog opens.
  useEffect(() => {
    if (open && !loaded && !loading && !failed && ratingCount > 0) void loadMore(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = filter === null ? reviews : reviews.filter((r) => r.rating === filter);
  const hasMore = loaded && !exhausted && reviews.length < ratingCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[640px] max-h-[85vh] flex-col gap-4">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("ratingDialog.title", { name: trainerName })}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("ratingDialog.description", { name: trainerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-3 rounded-xl bg-secondary px-4 py-3">
          <span className="text-3xl font-bold">{ratingAvg.toFixed(1)}</span>
          <div className="space-y-0.5">
            <RatingStars value={ratingAvg} showValue={false} size={16} />
            <p className="text-xs text-muted-foreground">
              {t("ratingDialog.basedOn", { count: ratingCount })}
            </p>
          </div>
        </div>

        {ratingCount > 0 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto" role="tablist" aria-label={t("ratingDialog.filter")}>
            {[null, 5, 4, 3, 2, 1].map((value) => (
              <button
                key={value ?? "all"}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  filter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                {value === null ? (
                  t("ratingDialog.all")
                ) : (
                  <>
                    {value}
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {ratingCount === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("noReviews")}</p>
        ) : (
          <div className="-mr-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            {loaded && visible.length === 0 && !loading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("ratingDialog.noneForFilter")}
              </p>
            )}
            <ul className="space-y-4">
              {visible.map((review) => (
                <li key={review.id} className="space-y-1 border-b border-border pb-4 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{review.author_name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString(
                        locale === "zh" ? "zh-TW" : "en-US",
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                  </div>
                  <span
                    className="flex items-center gap-0.5"
                    role="img"
                    aria-label={t("ratingDialog.stars", { count: review.rating })}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted"
                        }
                      />
                    ))}
                  </span>
                  {review.comment && (
                    <p className="text-sm text-foreground/80">{review.comment}</p>
                  )}
                </li>
              ))}
            </ul>
            {loading && (
              <div className="flex justify-center py-2">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            )}
            {failed && (
              <button
                type="button"
                onClick={() => loadMore(reviews.length)}
                className="text-sm text-destructive underline"
              >
                {t("ratingDialog.error")}
              </button>
            )}
            {hasMore && !loading && (
              <button
                type="button"
                onClick={() => loadMore(reviews.length)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                {t("loadMoreReviews")}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Rating row as a button that opens the rating dialog (for use outside a <Link>). */
export function RatingButton({
  trainerId,
  trainerName,
  ratingAvg,
  ratingCount,
  size,
}: {
  trainerId: string;
  trainerName: string;
  ratingAvg: number;
  ratingCount: number;
  size?: number;
}) {
  const { t } = useTranslation("trainer");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("ratingDialog.open")}
        className="rounded-md text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RatingStars value={ratingAvg} count={ratingCount} size={size} />
      </button>
      <RatingDialog
        open={open}
        onOpenChange={setOpen}
        trainerId={trainerId}
        trainerName={trainerName}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
      />
    </>
  );
}
