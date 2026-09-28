"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Minus, Plus, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { setWeeklyTarget } from "./goal-actions";

/** Weekly training-progress ring — real target + completed-this-week count,
 *  with an inline editor for the target. */
export function WeeklyProgressCard({
  title,
  target,
  done,
}: {
  title: string;
  target: number;
  done: number;
}) {
  const { t } = useTranslation("home");
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="relative p-5">
      <TargetEditor current={target} />
      <div className="flex items-center gap-4">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--muted)" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
            {pct}%
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("weeklyCount", { done, total: target })}
          </p>
        </div>
      </div>
    </Card>
  );
}

function TargetEditor({ current }: { current: number }) {
  const { t } = useTranslation("home");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setWeeklyTarget(value);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(current);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t("weeklyTarget.title")}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil size={15} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("weeklyTarget.title")}</DialogTitle>
          <DialogDescription>{t("weeklyTarget.desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-6 py-2">
          <button
            type="button"
            aria-label={t("weeklyTarget.decrease")}
            onClick={() => setValue((v) => Math.max(1, v - 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
          >
            <Minus size={18} />
          </button>
          <div className="text-center">
            <span className="text-4xl font-bold">{value}</span>
            <p className="text-xs text-muted-foreground">{t("weeklyTarget.unit")}</p>
          </div>
          <button
            type="button"
            aria-label={t("weeklyTarget.increase")}
            onClick={() => setValue((v) => Math.min(21, v + 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
          >
            <Plus size={18} />
          </button>
        </div>

        <Button onClick={save} disabled={saving} className="w-full gap-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t("weeklyTarget.save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
