"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StudioAvailability } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { cn } from "@/lib/utils";
import { addAvailability, removeAvailability } from "./studio-actions";
import { ListingSaveBar, useEnsureDraftListing, useStudioDraftRegistration } from "./listing-editor";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}
function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Manage the trainer's weekly availability slots. */
export function AvailabilityEditor({
  availability,
  hasListing,
}: {
  availability: StudioAvailability[];
  hasListing: boolean;
}) {
  const { t } = useTranslation(["studio", "trainer"]);
  const router = useRouter();
  const toast = useToast();
  const ensureDraftListing = useEnsureDraftListing();
  const registerDraft = useStudioDraftRegistration();
  const canEdit = hasListing || Boolean(ensureDraftListing);
  const [touched, setTouched] = useState(false);
  const [extra, setExtra] = useState<StudioAvailability[]>([]);
  const visibleSlots = [
    ...availability,
    ...extra.filter(
      (row) =>
        !availability.some(
          (a) =>
            a.id === row.id ||
            (a.weekday === row.weekday &&
              a.start_minute === row.start_minute &&
              a.end_minute === row.end_minute),
        ),
    ),
  ];
  const weekdays = t("trainer:weekdaysShort", { returnObjects: true }) as string[];

  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMinute = toMinutes(start);
  const endMinute = toMinutes(end);
  const rangeValid = endMinute > startMinute;
  const matchesSaved = visibleSlots.some(
    (a) => a.weekday === weekday && a.start_minute === startMinute && a.end_minute === endMinute,
  );
  const canCommitSlot = touched && canEdit && rangeValid && !matchesSaved;
  const slotRef = useRef({
    canCommitSlot,
    hasListing,
    weekday,
    startMinute,
    endMinute,
    ensureDraftListing,
  });
  slotRef.current = {
    canCommitSlot,
    hasListing,
    weekday,
    startMinute,
    endMinute,
    ensureDraftListing,
  };

  const flushSlot = useCallback(async () => {
    const d = slotRef.current;
    if (!d.canCommitSlot) return;
    if (!d.hasListing) await d.ensureDraftListing?.();
    const id = await addAvailability({
      weekday: d.weekday,
      startMinute: d.startMinute,
      endMinute: d.endMinute,
    });
    setExtra((prev) => [
      ...prev,
      {
        id,
        weekday: d.weekday,
        start_minute: d.startMinute,
        end_minute: d.endMinute,
      },
    ]);
    registerDraft?.noteSaved("availability");
    setTouched(false);
  }, [registerDraft]);

  useEffect(() => {
    registerDraft?.registerAvailability(flushSlot, canCommitSlot);
    return () => registerDraft?.registerAvailability(null, false);
  }, [registerDraft, flushSlot, canCommitSlot]);

  async function add() {
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (e <= s) {
      setError(t("studio:availability.badRange"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!hasListing) await ensureDraftListing?.();
      const id = await addAvailability({ weekday, startMinute: s, endMinute: e });
      setExtra((prev) => [
        ...prev,
        { id, weekday, start_minute: s, end_minute: e },
      ]);
      registerDraft?.noteSaved("availability");
      setTouched(false);
      toast.show(t("studio:toast.availabilityAdded"), "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio:error"));
      toast.show(t("studio:toast.availabilityAddFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      setExtra((prev) => prev.filter((row) => row.id !== id));
      await removeAvailability(id);
      toast.show(t("studio:toast.availabilityRemoved"), "success");
      router.refresh();
    } catch {
      toast.show(t("studio:toast.availabilityRemoveFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold">{t("studio:availability.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("studio:availability.subtitle")}
        </p>
      </div>

      {!canEdit ? (
        <p className="text-sm text-muted-foreground">
          {t("studio:offerings.needListing")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {visibleSlots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("studio:availability.empty")}
              </p>
            )}
            {visibleSlots.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  <span className="font-medium">{weekdays[a.weekday]}</span>
                  <span className="text-muted-foreground">
                    {"  "}
                    {toHHMM(a.start_minute)}–{toHHMM(a.end_minute)}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={t("studio:availability.remove")}
                  onClick={() => remove(a.id)}
                  disabled={busy}
                  className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                {t("studio:availability.weekday")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={weekday === d}
                    onClick={() => {
                      setTouched(true);
                      setWeekday(d);
                    }}
                    className={cn(
                      "h-9 min-w-9 rounded-full px-2 text-xs font-medium transition-colors",
                      weekday === d
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card hover:bg-accent",
                    )}
                  >
                    {weekdays[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="time"
                label={t("studio:availability.start")}
                value={start}
                onChange={(e) => {
                  setTouched(true);
                  setStart(e.target.value);
                }}
              />
              <Input
                type="time"
                label={t("studio:availability.end")}
                value={end}
                onChange={(e) => {
                  setTouched(true);
                  setEnd(e.target.value);
                }}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              variant="outline"
              onClick={add}
              disabled={busy}
              className="w-full gap-2"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {t("studio:availability.add")}
            </Button>
          </div>
        </>
      )}

      <ListingSaveBar />
    </Card>
  );
}
