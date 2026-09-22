"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { REST_NUDGE_SEC, clockText } from "./workout-progress";

/** The rest countdown, shown in place (last thing in the "Your sets" card, or at
 *  the top of the day list) while it runs. It is mounted only during a rest —
 *  when the time is up the state clears and this simply disappears. */
export function RestCountdown({
  left,
  onNudge,
  onStop,
}: {
  left: number;
  onNudge: (deltaSec: number) => void;
  onStop: () => void;
}) {
  const { t } = useTranslation("plan");
  return (
    <div role="timer" aria-live="off" className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground">{t("workout.rest.title")}</p>
        <p className="text-2xl font-extrabold tabular-nums leading-tight">{clockText(left)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <NudgeButton
          label={t("workout.rest.less", { sec: REST_NUDGE_SEC })}
          onClick={() => onNudge(-REST_NUDGE_SEC)}
          icon={<Minus size={14} aria-hidden />}
        />
        <NudgeButton
          label={t("workout.rest.add", { sec: REST_NUDGE_SEC })}
          onClick={() => onNudge(REST_NUDGE_SEC)}
          icon={<Plus size={14} aria-hidden />}
        />
        <Button size="sm" variant="secondary" onClick={onStop}>
          {t("workout.rest.skip")}
        </Button>
      </div>
    </div>
  );
}

function NudgeButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 items-center justify-center gap-0.5 rounded-full bg-muted px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
    >
      {icon}
      {REST_NUDGE_SEC}
    </button>
  );
}
