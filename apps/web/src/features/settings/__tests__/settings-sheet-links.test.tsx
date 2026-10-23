import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import settings from "@/locales/en/settings.json";
import profile from "@/locales/en/profile.json";
import common from "@/locales/en/common.json";
import type { UserProfile } from "@pacergo/shared";
import { SettingsSheet } from "../settings-sheet";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function openSheet(user: UserProfile | null) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["settings", "profile", "common"],
    defaultNS: "settings",
    resources: { en: { settings, profile, common } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={instance}>
      <SettingsSheet user={user} trigger={<button type="button">Open settings</button>} />
    </I18nextProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
}

const base = { id: "u1", display_name: "Ada", email: "ada@example.com", photo_url: null } as UserProfile;

describe("Settings sheet → account links (no detour through Profile)", () => {
  it("lists sessions, saved, studio, support and — for admins — the console", () => {
    openSheet({ ...base, is_companion: true, is_admin: true });
    const href = (name: string) => screen.getByRole("link", { name }).getAttribute("href");
    expect(href("My sessions")).toBe("/en/sessions");
    expect(href("Saved trainers")).toBe("/en/saved");
    expect(href("Trainer studio")).toBe("/en/studio");
    expect(href("Support")).toBe("/en/support");
    expect(href("Admin console")).toBe("/en/admin");
  });

  it("invites a member to become a trainer and hides the admin console", () => {
    openSheet({ ...base, is_companion: false, is_admin: false });
    expect(screen.getByRole("link", { name: "Become a trainer" })).toHaveAttribute(
      "href",
      "/en/studio",
    );
    expect(screen.queryByRole("link", { name: "Admin console" })).not.toBeInTheDocument();
  });

  it("shows no account links when signed out", () => {
    openSheet(null);
    expect(screen.queryByRole("link", { name: "My sessions" })).not.toBeInTheDocument();
  });
});
