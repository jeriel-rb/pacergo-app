"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

type TimePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

/**
 * OptServ-style time field: outline trigger + three-column popover
 * (hour 01–12 · minute 00–59 · AM/PM). Value is `HH:mm` (24h) when committed.
 */
export function TimePicker({
  value,
  onChange,
  placeholder,
  id,
  className,
  disabled = false,
  "aria-label": ariaLabel,
}: TimePickerProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = React.useState(false);
  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);

  // When there is no value yet, period stays null (not "AM") — defaulting it
  // silently let users pick hour/minute and submit without touching AM/PM.
  const parseTime = (timeStr?: string) => {
    if (!timeStr) {
      return { hour: "", minute: "", period: null as "AM" | "PM" | null };
    }
    const [hours, minutes] = timeStr.split(":");
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    return {
      hour: hour12.toString().padStart(2, "0"),
      minute: minutes || "00",
      period,
    };
  };

  const parsed = parseTime(value);

  const [pendingHour, setPendingHour] = React.useState<string | null>(null);
  const [pendingMinute, setPendingMinute] = React.useState<string | null>(null);
  const [pendingPeriod, setPendingPeriod] = React.useState<"AM" | "PM" | null>(
    null,
  );

  React.useEffect(() => {
    if (open) {
      setPendingHour(parsed.hour || null);
      setPendingMinute(parsed.minute || null);
      setPendingPeriod(parsed.period);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on open
  }, [open]);

  const hour = pendingHour ?? parsed.hour;
  const minute = pendingMinute ?? parsed.minute;
  const period = pendingPeriod;
  const needsPeriod = !!(hour && minute && !period);

  const hours = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );

  const handleTimeChange = (
    newHour: string,
    newMinute: string,
    newPeriod: "AM" | "PM" | null,
  ) => {
    setPendingHour(newHour);
    setPendingMinute(newMinute);
    setPendingPeriod(newPeriod);
    if (!newPeriod) return;
    let hour24 = parseInt(newHour, 10);
    if (newPeriod === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (newPeriod === "AM" && hour24 === 12) {
      hour24 = 0;
    }
    onChange?.(`${hour24.toString().padStart(2, "0")}:${newMinute}`);
  };

  const formatDisplayTime = () => {
    if (!value) return null;
    return `${parsed.hour}:${parsed.minute} ${parsed.period}`;
  };

  return (
    // modal — own dismiss/focus layer so clicks work inside a parent Dialog.
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-11 w-full justify-between px-3.5 text-left font-normal",
            !value && "text-muted-foreground",
            !value && needsPeriod && "border-destructive text-destructive",
            className,
          )}
        >
          <span className="truncate">
            {formatDisplayTime() ??
              (needsPeriod
                ? t("timePicker.selectAmPm")
                : (placeholder ?? t("timePicker.placeholder")))}
          </span>
          <Clock className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-visible p-0"
        align="start"
        collisionPadding={16}
      >
        {needsPeriod && (
          <p className="px-2 pt-2 text-xs text-destructive">
            {t("timePicker.selectAmPmHint")}
          </p>
        )}
        <div className="flex">
          <div
            ref={hoursRef}
            className="h-56 w-16 overflow-y-scroll overscroll-contain border-r scroll-smooth"
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              pointerEvents: "auto",
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              {hours.map((h) => (
                <Button
                  key={h}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-center font-normal pointer-events-auto",
                    hour === h && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => handleTimeChange(h, minute || "00", period)}
                >
                  {h}
                </Button>
              ))}
            </div>
          </div>

          <div
            ref={minutesRef}
            className="h-56 w-16 overflow-y-scroll overscroll-contain border-r scroll-smooth"
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              pointerEvents: "auto",
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              {minutes.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-center font-normal pointer-events-auto",
                    minute === m && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => handleTimeChange(hour || "12", m, period)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-start p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "w-14 justify-center font-normal",
                period === "AM" && "bg-accent text-accent-foreground",
              )}
              onClick={() =>
                handleTimeChange(hour || "12", minute || "00", "AM")
              }
            >
              AM
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "w-14 justify-center font-normal",
                period === "PM" && "bg-accent text-accent-foreground",
              )}
              onClick={() =>
                handleTimeChange(hour || "12", minute || "00", "PM")
              }
            >
              PM
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
