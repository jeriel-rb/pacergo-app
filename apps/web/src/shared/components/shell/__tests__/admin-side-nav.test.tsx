import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import { SideNav } from "../side-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/admin",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderNav(lng: "en" | "zh") {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["admin"],
    defaultNS: "admin",
    resources: { en: { admin: en }, zh: { admin: zh } },
    interpolation: { escapeValue: false },
  });
  return render(
    <I18nextProvider i18n={instance}>
      <SideNav variant="admin" />
    </I18nextProvider>,
  );
}

describe("admin sidebar footer", () => {
  it("puts Back, the theme toggle and the language switcher on one row", () => {
    renderNav("en");
    const back = screen.getByRole("link", { name: "Back to Pacergo" });
    expect(back).toHaveTextContent(/^Back$/);
    const row = back.parentElement!;
    expect(row.className).toContain("flex");
    expect(row.className).not.toContain("flex-col");
    // the toggle and the switcher are siblings of the back link, not on a second row
    expect(row.querySelectorAll("button").length).toBeGreaterThanOrEqual(3); // theme + 中文 + EN
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
  });

  it("uses the short label in Chinese too", () => {
    renderNav("zh");
    expect(screen.getByRole("link", { name: "返回 Pacergo" })).toHaveTextContent(/^返回$/);
  });
});
