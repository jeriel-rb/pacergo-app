"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import type { ConsentSlug } from "@/lib/consent";

/** One checkbox row with inline links to one or more legal documents.
 *  Shared by the sign-up gate (terms_of_service + privacy_policy +
 *  risk_disclosure) and the studio gate (partner_conduct_rules) — same
 *  markup, different `label`/`documents`. */
export function ConsentCheckboxRow({
  id,
  checked,
  onChange,
  label,
  documents,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** i18n key in the `legal` namespace for the sentence, e.g. "signUpAgreement". */
  label: string;
  documents: { slug: ConsentSlug; labelKey: string }[];
}) {
  const { t } = useTranslation("legal");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);

  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs">
      <Checkbox id={id} checked={checked} onChange={onChange} />
      {/* Sized (text-xs) and given whitespace-nowrap so the whole sentence
          fits on one line in the ~400px auth card instead of wrapping —
          requested explicitly rather than left to wrap naturally. If a
          locale/translation makes this too long even at text-xs, it will
          overflow rather than wrap; keep link labels short (see legal.json
          linkLabel keys) to stay within a normal card width. */}
      <span className="whitespace-nowrap leading-relaxed text-muted-foreground">
        {t(label)}{" "}
        {documents.map((doc, i) => (
          <Link
            key={doc.slug}
            href={getLocalizedPath(`/legal/${doc.slug}`, locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
            // Prevent the click from also toggling the checkbox (the <label>
            // wraps everything so the checkbox is easy to tap/click too).
            onClick={(e) => e.stopPropagation()}
          >
            {t(doc.labelKey)}
          </Link>
        ))
          // Interleave separators as plain text nodes (not inside the links,
          // and not wrapped in their own <span>) so "," and "and" flow with
          // the surrounding words instead of anchoring a break point.
          .flatMap((el, i) => {
            if (i === documents.length - 1) return [el];
            const sep = i === documents.length - 2 ? ` ${t("and")} ` : `${t("listSeparator")} `;
            return [el, sep];
          })}
      </span>
    </label>
  );
}
