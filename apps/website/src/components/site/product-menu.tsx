"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronDown, Sparkles, UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

/** Desktop product dropdown with click, keyboard, outside-click, and Escape support. */
export function ProductMenu() {
  const { t } = useTranslation("nav");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const home = getLocalizedPath("/", locale);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  const items = [
    {
      href: `${home}#ai-coach`,
      label: t("menu.ai_coach"),
      Icon: Sparkles,
    },
    {
      href: getLocalizedPath("/find", locale),
      label: t("menu.find_partner"),
      Icon: UserSearch,
    },
    {
      href: `${home}#progress`,
      label: t("menu.progress"),
      Icon: Activity,
    },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openAndFocusFirst = () => {
    setOpen(true);
    window.requestAnimationFrame(() => firstItemRef.current?.focus());
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-(--radius) text-sm font-medium text-ink/65 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openAndFocusFirst();
          }
        }}
      >
        {t("product")}
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("product")}
          className="absolute left-1/2 top-full z-50 mt-3 w-[260px] -translate-x-1/2 rounded-xl border border-ink/10 bg-paper p-2 shadow-[0_24px_60px_-24px_rgba(10,10,10,0.35)]"
        >
          {items.map(({ href, label, Icon }, index) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              ref={index === 0 ? firstItemRef : undefined}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg p-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
