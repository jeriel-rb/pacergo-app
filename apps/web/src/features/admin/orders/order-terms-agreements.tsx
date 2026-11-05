"use client";

import { useTranslation } from "react-i18next";
import { formatInAppTimeZone } from "@pacergo/shared";
import type { AdminTermsAgreement } from "@/lib/admin";
import { useLocale } from "@/shared/hooks/use-locale";

/** Trainer agrees before accepting, member before paying: that order. */
const ROLES: AdminTermsAgreement["role"][] = ["companion", "seeker"];

/** The booking safety terms each side agreed to for this order: who, when,
 *  which version and in which language. Shared by the order sheet and page. */
export function OrderTermsAgreements({
  agreements,
}: {
  agreements: AdminTermsAgreement[] | undefined;
}) {
  const { t } = useTranslation("admin");
  const locale = useLocale();
  const list = agreements ?? [];

  const stamp = (iso: string) =>
    formatInAppTimeZone(iso, locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{t("orders.terms.title")}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {ROLES.map((role) => {
          const rows = list.filter((a) => a.role === role);
          return (
            <div key={role} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {t(`orders.terms.role.${role}`)}
                {rows[0]?.user_name ? ` · ${rows[0].user_name}` : ""}
              </dt>
              {rows.length === 0 ? (
                <dd className="font-medium text-muted-foreground">{t("orders.terms.missing")}</dd>
              ) : (
                rows.map((a) => (
                  <dd key={`${a.terms_version}-${a.accepted_at}`} className="font-medium">
                    {t("orders.terms.detail", {
                      when: stamp(a.accepted_at),
                      version: a.terms_version,
                      language: t(`orders.terms.language.${a.locale}`),
                    })}
                  </dd>
                ))
              )}
            </div>
          );
        })}
      </dl>
      <p className="text-xs text-muted-foreground">{t("orders.terms.notice")}</p>
    </section>
  );
}
