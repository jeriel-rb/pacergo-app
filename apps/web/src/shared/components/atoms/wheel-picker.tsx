"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const VIEWPORT_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const PAD = (VIEWPORT_HEIGHT - ROW_HEIGHT) / 2;

/** Vertical scroll-snap value wheel (iOS-style): the centered row is the
 *  selected value, rows fade/shrink with distance from center. Scrolling and
 *  clicking a row both commit a value; there is no separate "confirm" step. */
export function WheelPicker({
  values,
  value,
  onChange,
  formatValue,
  suffix,
  ariaLabel,
  className,
}: {
  values: readonly number[];
  value: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  suffix?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const suppressScroll = React.useRef(false);
  const rafId = React.useRef<number | null>(null);

  const index = Math.max(0, values.indexOf(value));

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    suppressScroll.current = true;
    // `scroll-smooth` would animate this jump from the top and the in-flight
    // scroll events would overwrite the value, so jump instantly.
    el.scrollTo({ top: index * ROW_HEIGHT, behavior: "instant" });
    const id = window.setTimeout(() => {
      suppressScroll.current = false;
    }, 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync only when the target index/list changes
  }, [index, values]);

  function handleScroll() {
    if (suppressScroll.current) return;
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const nearest = Math.round(el.scrollTop / ROW_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, nearest));
      const next = values[clamped];
      if (next !== undefined && next !== value) onChange(next);
    });
  }

  function selectIndex(i: number) {
    containerRef.current?.scrollTo({ top: i * ROW_HEIGHT, behavior: "smooth" });
  }

  function step(delta: number) {
    const next = Math.max(0, Math.min(values.length - 1, index + delta));
    onChange(values[next]);
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          step(-1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          step(1);
        }
      }}
      className={cn(
        "snap-y snap-mandatory overflow-y-scroll overscroll-contain scroll-smooth outline-none",
        className,
      )}
      style={{ height: VIEWPORT_HEIGHT, paddingTop: PAD, paddingBottom: PAD }}
    >
      {values.map((v, i) => {
        const distance = Math.abs(i - index);
        const active = distance === 0;
        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- listbox option, keyboard handled on the container
          <div
            key={v}
            role="option"
            aria-selected={active}
            onClick={() => selectIndex(i)}
            className="flex snap-center cursor-pointer items-center justify-center transition-[opacity,transform] duration-150"
            style={{
              height: ROW_HEIGHT,
              opacity: active ? 1 : distance === 1 ? 0.45 : 0.2,
              transform: `scale(${active ? 1 : 0.85})`,
            }}
          >
            <span
              className={cn(
                "font-semibold tabular-nums",
                active ? "text-2xl text-foreground" : "text-lg text-muted-foreground",
              )}
            >
              {formatValue ? formatValue(v) : v}
              {suffix && <span className="ml-1 text-sm font-normal">{suffix}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
