"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";

/** Desktop "Product" dropdown linking to the two audience pages (localized). */
export function ProductMenu() {
  const { t } = useTranslation("nav");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);

  const items = [
    {
      href: getLocalizedPath("/find", locale),
      label: t("menu.find_label"),
      desc: t("menu.find_desc"),
      Icon: Search,
    },
    {
      href: getLocalizedPath("/earn", locale),
      label: t("menu.earn_label"),
      desc: t("menu.earn_desc"),
      Icon: Wallet,
    },
  ];

  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink/65 transition-colors group-hover:text-ink"
        aria-haspopup="true"
      >
        {t("product")}
        <ChevronDown className="size-4 transition-transform duration-200 group-hover:rotate-180" />
      </button>

      {/* pt-3 bridges the gap so hover doesn't drop between trigger and panel */}
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-[330px] rounded-2xl border border-ink/10 bg-paper p-2 shadow-[0_24px_60px_-24px_rgba(10,10,10,0.35)]">
          {items.map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-ink/5"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
