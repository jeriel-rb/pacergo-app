import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import type { AdminTermsAgreement } from "@/lib/admin";
import { OrderTermsAgreements } from "../order-terms-agreements";

function renderList(agreements: AdminTermsAgreement[] | undefined) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["admin"],
    defaultNS: "admin",
    resources: { en: { admin: en } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={instance}>
      <OrderTermsAgreements agreements={agreements} />
    </I18nextProvider>,
  );
}

const terms = en.orders.terms;

describe("Admin order: safety terms agreements", () => {
  it("shows who agreed, when, which version and in which language", () => {
    renderList([
      {
        role: "companion",
        user_name: "Bob",
        activity_slug: "hiking",
        terms_version: "2026-11-05",
        locale: "zh",
        accepted_at: "2026-11-05T02:00:00Z",
      },
      {
        role: "seeker",
        user_name: "Alice",
        activity_slug: "hiking",
        terms_version: "2026-11-05",
        locale: "en",
        accepted_at: "2026-11-05T03:00:00Z",
      },
    ]);
    expect(screen.getByText(`${terms.role.companion} · Bob`)).toBeInTheDocument();
    expect(screen.getByText(`${terms.role.seeker} · Alice`)).toBeInTheDocument();
    expect(screen.getByText(/version 2026-11-05 · Chinese/)).toBeInTheDocument();
    expect(screen.getByText(/version 2026-11-05 · English/)).toBeInTheDocument();
    expect(screen.queryByText(terms.missing)).not.toBeInTheDocument();
  });

  it("says 'Not recorded' for older orders", () => {
    renderList(undefined);
    expect(screen.getAllByText(terms.missing)).toHaveLength(2);
  });

  it("has the same labels in Chinese", () => {
    expect(Object.keys(zh.orders.terms).sort()).toEqual(Object.keys(en.orders.terms).sort());
  });
});
