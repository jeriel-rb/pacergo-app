import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/notifications.json";
import zh from "@/locales/zh/notifications.json";
import type { AppNotification } from "@/lib/notifications";
import { NotificationsView } from "../notifications-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/en/notifications",
}));
vi.mock("../notification-actions", () => ({
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

function i18n(lng: "en" | "zh") {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["notifications"],
    defaultNS: "notifications",
    resources: { en: { notifications: en }, zh: { notifications: zh } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

const n = (over: Partial<AppNotification>): AppNotification => ({
  id: "n1",
  type: "verification_rejected",
  payload: { activity: "running", label: "NASM-CPT", notes: "The scan is blurry." },
  read_at: "2026-10-06T00:00:00Z",
  created_at: "2026-10-06T00:00:00Z",
  ...over,
});

function renderView(list: AppNotification[], lng: "en" | "zh" = "en") {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <NotificationsView notifications={list} />
    </I18nextProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("NotificationsView — trainer request review", () => {
  it("opens a dialog with the reviewer's reason when a rejection is clicked", () => {
    renderView([n({})]);
    fireEvent.click(screen.getByRole("button", { name: /Your trainer request was rejected/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Trainer request rejected")).toBeInTheDocument();
    expect(within(dialog).getByText("The scan is blurry.")).toBeInTheDocument();
    expect(within(dialog).getByText(/NASM-CPT/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so when the reviewer gave no reason", () => {
    renderView([n({ payload: { activity: "running", label: "X", notes: null } })]);
    fireEvent.click(screen.getByRole("button", { name: /rejected/ }));
    expect(screen.getByText("No reason was provided.")).toBeInTheDocument();
  });

  it("shows an approval as plain text, not a button", () => {
    renderView([n({ type: "verification_approved" })]);
    expect(screen.getByText("Your trainer request was approved")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["en", "zh"] as const)("has no untranslated keys in %s", (lng) => {
    const { container } = renderView([n({}), n({ id: "n2", type: "verification_approved" })], lng);
    expect(container.textContent).not.toMatch(/\b(type|rejection)\.[a-z_]+/);
  });
});
