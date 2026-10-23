import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/nav.json";
import zh from "@/locales/zh/nav.json";
import { RoleBadges } from "../role-badges";

function renderBadges(
  user: { is_companion?: boolean; is_admin?: boolean } | null,
  lng: "en" | "zh" = "en",
) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["nav"],
    defaultNS: "nav",
    resources: { en: { nav: en }, zh: { nav: zh } },
    interpolation: { escapeValue: false },
  });
  return render(
    <I18nextProvider i18n={instance}>
      <RoleBadges user={user} />
    </I18nextProvider>,
  );
}

describe("RoleBadges (next to the bell)", () => {
  it("tags a non-trainer as Member", () => {
    renderBadges({ is_companion: false, is_admin: false });
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.queryByText("Trainer")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("tags a trainer as Trainer, never also Member", () => {
    renderBadges({ is_companion: true });
    expect(screen.getByText("Trainer")).toBeInTheDocument();
    expect(screen.queryByText("Member")).not.toBeInTheDocument();
  });

  it("adds Admin on top of the Member / Trainer split", () => {
    renderBadges({ is_companion: true, is_admin: true });
    expect(screen.getByText("Trainer")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("keeps both tags on one line, never stacked", () => {
    renderBadges({ is_companion: true, is_admin: true });
    const row = screen.getByText("Trainer").parentElement!;
    expect(row).toContainElement(screen.getByText("Admin"));
    expect(row.className).toMatch(/\bflex\b/);
    expect(row.className).toMatch(/\bflex-nowrap\b/);
    expect(row.className).not.toMatch(/\bflex-col\b/);
  });

  it("still shows Member for an admin who isn't a trainer", () => {
    renderBadges({ is_companion: false, is_admin: true });
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows nothing when signed out", () => {
    const { container } = renderBadges(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("gives each role its own colour, in light and dark mode", () => {
    renderBadges({ is_companion: false, is_admin: true });
    const member = screen.getByText("Member").className;
    const admin = screen.getByText("Admin").className;
    renderBadges({ is_companion: true });
    const trainer = screen.getByText("Trainer").className;

    const hue = (c: string) => c.match(/\bbg-(\w+)-\d+/)?.[1];
    expect(new Set([hue(member), hue(trainer), hue(admin)]).size).toBe(3);
    for (const c of [member, trainer, admin]) {
      expect(c).toMatch(/\bdark:bg-/);
      expect(c).toMatch(/\bdark:text-/);
      // never the page's own grey, which made Member disappear against the bar
      expect(c).not.toMatch(/\bbg-muted\b|text-muted-foreground/);
    }
  });

  it("uses the admin console's Chinese role names", () => {
    renderBadges({ is_companion: true, is_admin: true }, "zh");
    expect(screen.getByText("陪練")).toBeInTheDocument();
    expect(screen.getByText("管理員")).toBeInTheDocument();
  });
});
