import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import { AppHeader } from "../app-header";
import { BottomNav } from "../bottom-nav";
import { ADMIN_NAV_ITEMS, adminBottomNavItems } from "../admin-nav-items";

let path = "/en/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => path,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function i18n(lng: "en" | "zh") {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["admin"],
    defaultNS: "admin",
    resources: { en: { admin: en }, zh: { admin: zh } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const wrap = (lng: "en" | "zh", ui: React.ReactNode) =>
  render(<I18nextProvider i18n={i18n(lng)}>{ui}</I18nextProvider>);

describe("admin bottom bar (phone)", () => {
  it("puts the dashboard in the middle", () => {
    path = "/en/admin";
    wrap("en", <BottomNav variant="admin" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links.map((l) => l.getAttribute("aria-label"))).toEqual([
      "Trainer requests",
      "Orders",
      "Dashboard",
      "Payouts",
      "CSV export",
    ]);
    expect(links[2]!.getAttribute("href")).toBe("/en/admin");
  });

  it("keeps the dashboard first in the desktop sidebar order", () => {
    expect(ADMIN_NAV_ITEMS[0]!.key).toBe("dashboard");
    const bottom = adminBottomNavItems();
    expect(bottom).toHaveLength(ADMIN_NAV_ITEMS.length);
    expect(bottom[Math.floor(bottom.length / 2)]!.key).toBe("dashboard");
  });

  it("shows icons only — no text labels — but keeps accessible names", () => {
    path = "/en/admin";
    wrap("en", <BottomNav variant="admin" />);
    const nav = screen.getByRole("navigation");
    expect(nav.textContent).toBe("");
    for (const link of within(nav).getAllByRole("link")) {
      expect(link.getAttribute("aria-label")).toBeTruthy();
      expect(link.getAttribute("title")).toBe(link.getAttribute("aria-label"));
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });

  it("marks the current page", () => {
    path = "/en/admin/orders";
    wrap("en", <BottomNav variant="admin" />);
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("is localized", () => {
    path = "/zh/admin";
    wrap("zh", <BottomNav variant="admin" />);
    expect(screen.getByRole("link", { name: "儀表板" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "陪練申請" })).toBeInTheDocument();
  });
});

describe("admin header (phone)", () => {
  it("has the back arrow first, on the far left, then the avatar and the title", () => {
    path = "/en/admin";
    wrap("en", <AppHeader variant="admin" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    // 1st: back out of the admin console — an icon, no text label
    expect(links[0]!.getAttribute("href")).toBe("/en");
    expect(links[0]!.getAttribute("aria-label")).toBe("Back to Pacergo");
    expect(links[0]!.textContent).toBe("");
    expect(links[0]!.querySelector("svg")).not.toBeNull();
    // 2nd: the avatar and the title
    expect(links[1]!.textContent).toBe("AAdmin console");
    expect(links[1]!.getAttribute("href")).toBe("/en/admin");
  });

  it("has no hard-coded Chinese suffix and no 'Back to Pacergo' text", () => {
    path = "/en/admin";
    wrap("en", <AppHeader variant="admin" />);
    const text = screen.getByRole("banner").textContent ?? "";
    expect(text).not.toContain("陪練動");
    expect(text).not.toContain("Back to Pacergo");
    expect(text).not.toContain("—");
  });

  it("localizes the title", () => {
    path = "/zh/admin";
    wrap("zh", <AppHeader variant="admin" />);
    const header = screen.getByRole("banner");
    expect(header.textContent).toBe("A管理後台");
    expect(within(header).getAllByRole("link")[0]!.getAttribute("aria-label")).toBe("返回 Pacergo");
  });
});
