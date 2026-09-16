"use client";

import * as React from "react";
import { format } from "date-fns";
import { enUS, zhTW } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  calendarDateKeyInAppTz,
  calendarDayKeyFromLocalDate,
} from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useLocale } from "@/shared/hooks/use-locale";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  date?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  /** Disallow picking dates before this day (inclusive min). */
  minDate?: Date;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

/**
 * OptServ-style date field: outline trigger + calendar popover.
 * Keeps height/border tokens aligned with Input / SelectTrigger (h-11).
 * Past-day gating uses Asia/Taipei "today".
 */
export function DatePicker({
  date,
  onChange,
  placeholder,
  minDate,
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const locale = useLocale();
  const { t } = useTranslation("common");
  const dfLocale = locale === "zh" ? zhTW : enUS;
  const [open, setOpen] = React.useState(false);

  const minKey = minDate ? calendarDateKeyInAppTz(minDate) : null;
  const display = date
    ? format(date, locale === "zh" ? "yyyy/MM/dd" : "MM/dd/yyyy", {
        locale: dfLocale,
      })
    : null;

  return (
    // modal — own dismiss/focus layer so clicks work inside a parent Dialog.
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? t("pickDate", { defaultValue: "Pick a date" })}
          className={cn(
            "h-11 w-full justify-between px-3.5 font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{display ?? placeholder}</span>
          <CalendarIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
        collisionPadding={16}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(next) => {
            onChange(next);
            if (next) setOpen(false);
          }}
          locale={dfLocale}
          defaultMonth={date ?? minDate ?? new Date()}
          disabled={
            minKey
              ? (d) => calendarDayKeyFromLocalDate(d) < minKey
              : undefined
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
