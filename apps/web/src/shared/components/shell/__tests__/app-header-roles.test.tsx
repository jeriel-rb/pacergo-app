import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import nav from "@/locales/en/nav.json";
import notifications from "@/locales/en/notifications.json";
import type { UserProfile } from "@pacergo/shared";
import { AppHeader } from "../app-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderHeader(user: UserProfile | null) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["nav", "notifications"],
    defaultNS: "nav",
    resources: { en: { nav, notifications } },
    interpolation: { escapeValue: false },
  });
  return render(
    <I18nextProvider i18n={instance}>
      <AppHeader unreadCount={0} user={user} />
    </I18nextProvider>,
  );
}

const member = { id: "u1", display_name: "Ada", is_companion: false } as UserProfile;

describe("phone top bar → role tag", () => {
  it("shows Member beside the bell", () => {
    renderHeader(member);
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Member")).toBeVisible();
    // tag and bell share the right-hand group, tag first
    const bell = within(header).getByRole("link", { name: "Notifications" });
    const group = bell.parentElement!;
    expect(within(group).getByText("Member")).toBeInTheDocument();
    expect(group.firstElementChild).not.toBe(bell);
  });

  it("shows no tag when signed out", () => {
    renderHeader(null);
    expect(screen.queryByText("Member")).not.toBeInTheDocument();
  });
});
