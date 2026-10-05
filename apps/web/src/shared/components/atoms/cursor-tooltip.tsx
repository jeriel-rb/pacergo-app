"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const CURSOR_OFFSET = 14;
const VIEWPORT_MARGIN = 8;

type Point = { x: number; y: number };

/** A tooltip that follows the mouse pointer while it is over the trigger.
 *
 *  - Mouse: the tooltip sits next to the cursor and tracks it; it flips to the
 *    other side of the cursor near the screen edge.
 *  - Keyboard focus / touch tap: there is no pointer to follow, so it anchors
 *    under the trigger instead (tap toggles, tapping elsewhere closes).
 *
 *  It renders in a portal (never clipped by an `overflow-hidden` card) and uses
 *  the popover theme tokens, so it follows light / dark mode. The trigger is a
 *  button that does not navigate when it sits inside a link. */
export function CursorTooltip({
  content,
  label,
  children,
  className,
  tooltipClassName,
}: {
  content: React.ReactNode;
  /** Accessible name for the trigger button. */
  label: string;
  children: React.ReactNode;
  className?: string;
  tooltipClassName?: string;
}) {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState<Point | null>(null);
  const [follow, setFollow] = React.useState(false);
  const [placed, setPlaced] = React.useState<Point | null>(null);

  const anchorToTrigger = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFollow(false);
    setAnchor({ x: rect.left, y: rect.bottom });
  }, []);

  // Place the tooltip next to the anchor, flipping at the viewport edges.
  React.useLayoutEffect(() => {
    if (!anchor || !tipRef.current) {
      setPlaced(null);
      return;
    }
    const { offsetWidth: w, offsetHeight: h } = tipRef.current;
    const gap = follow ? CURSOR_OFFSET : 6;
    let x = anchor.x + (follow ? gap : 0);
    let y = anchor.y + gap;
    if (x + w > window.innerWidth - VIEWPORT_MARGIN) {
      x = follow ? anchor.x - gap - w : window.innerWidth - VIEWPORT_MARGIN - w;
    }
    if (y + h > window.innerHeight - VIEWPORT_MARGIN) {
      y = follow ? anchor.y - gap - h : anchor.y - 30 - h;
    }
    setPlaced({
      x: Math.max(VIEWPORT_MARGIN, x),
      y: Math.max(VIEWPORT_MARGIN, y),
    });
  }, [anchor, follow]);

  // A tap-opened tooltip closes when you tap anywhere else.
  React.useEffect(() => {
    if (!anchor || follow) return;
    const onDown = (e: PointerEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setAnchor(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [anchor, follow]);

  const onPointer = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setFollow(true);
    setAnchor({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={anchor ? id : undefined}
        onPointerEnter={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setAnchor(null);
        }}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) anchorToTrigger();
        }}
        onBlur={() => setAnchor(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAnchor(null);
        }}
        onClick={(e) => {
          // Inside a link card: never navigate from the badge.
          e.preventDefault();
          e.stopPropagation();
          if (anchor && !follow) setAnchor(null);
          else if (!follow) anchorToTrigger();
        }}
        className={className}
      >
        {children}
      </button>
      {anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{
              left: placed?.x ?? 0,
              top: placed?.y ?? 0,
              // Measure first, then reveal at the computed position.
              visibility: placed ? "visible" : "hidden",
            }}
            className={cn(
              "pointer-events-none fixed z-[100] rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md",
              tooltipClassName,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
