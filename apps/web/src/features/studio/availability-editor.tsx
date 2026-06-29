"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StudioAvailability } from "@/lib/studio";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { addAvailability, removeAvailability } from "./studio-actions";

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
  const weekdays = t("trainer:weekdaysShort", { returnObjects: true }) as string[];

  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await addAvailability({ weekday, startMinute: s, endMinute: e });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio:error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await removeAvailability(id);
      router.refresh();
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

      {!hasListing ? (
        <p className="text-sm text-muted-foreground">
          {t("studio:offerings.needListing")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {availability.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("studio:availability.empty")}
              </p>
            )}
            {availability.map((a) => (
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
                    onClick={() => setWeekday(d)}
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
                onChange={(e) => setStart(e.target.value)}
              />
              <Input
                type="time"
                label={t("studio:availability.end")}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
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
    </Card>
  );
}
