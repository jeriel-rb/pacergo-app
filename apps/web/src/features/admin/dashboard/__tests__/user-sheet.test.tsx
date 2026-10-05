import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import type { AdminUserDetail } from "@/lib/admin";
import { UserSheet } from "../user-sheet";

const fetchBankAccountNumber = vi.fn();
vi.mock("../../admin-actions", () => ({
  fetchBankAccountNumber: (...a: unknown[]) => fetchBankAccountNumber(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchBankAccountNumber.mockResolvedValue("123456780912");
});

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

const member: AdminUserDetail = {
  id: "u1",
  display_name: "Mia Member",
  photo_url: null,
  email: "mia@example.com",
  email_confirmed: true,
  is_admin: false,
  is_companion: false,
  created_at: "2026-09-03T08:00:00Z",
  updated_at: "2026-10-01T08:00:00Z",
  last_sign_in_at: "2026-10-04T08:00:00Z",
  profile: { bio: "Loves morning runs", gender: "female", age: 29, home_area: "Taipei", locale: "zh", experience_level: "beginner", weekly_target: 4 },
  setup: { profile_setup_status: "completed", onboarding_completed: true },
  fitness: { primary_activity: "running", goal: "lose_weight", experience: "beginner" },
  activity: { bookings_made: 5, bookings_received: 0, reviews_given: 3, saved_trainers: 7 },
  safety: {
    blocked_by_me: 1,
    blocked_me: 0,
    reports_filed: 0,
    reports_received: 2,
    consents: [{ document: "terms_of_service", version: "v1", accepted_at: "2026-09-03T08:05:00Z" }],
  },
  trainer: null,
};

const trainer: AdminUserDetail = {
  ...member,
  id: "u2",
  display_name: "Tom Trainer",
  email: "tom@example.com",
  is_companion: true,
  trainer: {
    listing: {
      headline: "Strength coach",
      served_area: "Da'an",
      status: "active",
      rating_avg: 4.8,
      rating_count: 12,
      offerings: [{ activity: "gym", tier: "A", price_ntd: 1200, is_free: false, session_minutes: 60 }],
    },
    verifications: [
      { id: "v1", doc_type: "certification", activity: "gym", label: "NASM-CPT", status: "approved", created_at: "2026-09-10T08:00:00Z", reviewed_at: "2026-09-11T08:00:00Z" },
    ],
    money: {
      available_balance: 3200,
      open_withdrawals_count: 1,
      open_withdrawals_sum: 1000,
      total_paid_out: 8000,
      completed_orders: 14,
      bank_code: "808",
      bank_name: "Taiwan Bank",
      branch_name: "Da'an",
      bank_account_holder: "Tom Trainer",
      bank_account_mask: "********1234",
      has_bank_account: true,
    },
  },
};

function renderSheet(
  props: Partial<Parameters<typeof UserSheet>[0]> = {},
  lng: "en" | "zh" = "en",
) {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <UserSheet
        open
        onOpenChange={() => {}}
        detail={member}
        loading={false}
        error={false}
        onRetry={() => {}}
        {...props}
      />
    </I18nextProvider>,
  );
}

const section = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("UserSheet", () => {
  it("shows the name and email in the header", () => {
    renderSheet();
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Mia Member", { selector: "h2" })).toBeInTheDocument();
    expect(within(sheet).getAllByText("mia@example.com").length).toBeGreaterThan(0);
  });

  it("groups everything into accordion sections, all open by default", () => {
    renderSheet();
    for (const name of ["Account", "Profile", "Fitness profile", "Activity", "Trust & safety"]) {
      expect(section(name)).toHaveAttribute("aria-expanded", "true");
    }
  });

  it("lists every detail as its own row — label, then value — not in columns or cards", () => {
    renderSheet();
    const profile = screen.getByRole("region", { name: "Profile" });
    // each fact is one row: "Gender: Female"
    const gender = within(profile).getByText("Gender").closest("div")!;
    expect(gender.textContent).toBe("Gender: Female");
    const rows = Array.from(profile.querySelectorAll(":scope > div > div"));
    expect(rows.length).toBe(9);
    // one per line: the rows' container is a vertical stack, not a grid
    const stack = profile.firstElementChild as HTMLElement;
    expect(stack.className).toContain("space-y-2");
    expect(stack.className).not.toContain("grid");
    // each row has an icon, and the sheet has no tables
    for (const row of rows) expect(row.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("dialog").querySelector("table")).toBeNull();
  });

  it("separates the sections with dividers, with no box around the accordion", () => {
    renderSheet();
    const accordion = screen.getByRole("button", { name: /^Account/ }).closest("section")!.parentElement as HTMLElement;
    expect(accordion.className).toContain("divide-y");
    expect(accordion.className.split(" ")).not.toContain("border");
    expect(accordion.className).not.toMatch(/rounded/);
  });

  it("lets a section be collapsed", () => {
    renderSheet();
    const body = screen.getByText("Loves morning runs");
    expect(body).toBeVisible();
    fireEvent.click(section("Profile"));
    expect(body).not.toBeVisible();
  });

  it("shows the account details", () => {
    renderSheet();
    const panel = screen.getByRole("region", { name: "Account" });
    expect(within(panel).getByText("Member")).toBeInTheDocument();
    expect(within(panel).getByText("mia@example.com")).toBeInTheDocument();
    expect(within(panel).getByText("Verified")).toBeInTheDocument();
    for (const label of ["Joined", "Last signed in", "Last updated"]) {
      expect(within(panel).getByText(label)).toBeInTheDocument();
    }
  });

  it("shows profile, fitness profile, activity and safety facts", () => {
    renderSheet();
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(within(profile).getByText("Female")).toBeInTheDocument();
    expect(within(profile).getByText("29")).toBeInTheDocument(); // age, not a birthdate
    expect(within(profile).getByText("Taipei")).toBeInTheDocument();
    expect(within(profile).getByText("中文")).toBeInTheDocument();
    expect(within(profile).getByText("Completed")).toBeInTheDocument();
    const fitness = screen.getByRole("region", { name: "Fitness profile" });
    expect(within(fitness).getByText("Running")).toBeInTheDocument();
    expect(within(fitness).getByText("Lose weight")).toBeInTheDocument();
    const activity = screen.getByRole("region", { name: "Activity" });
    for (const label of ["Bookings made", "Bookings received", "Reviews given", "Saved trainers"]) {
      expect(within(activity).getByText(label)).toBeInTheDocument();
    }
    expect(within(activity).getByText("7")).toBeInTheDocument();
    const safety = screen.getByRole("region", { name: "Trust & safety" });
    expect(within(safety).getByText("Reports received")).toBeInTheDocument();
    expect(within(safety).getByText("Terms of Service")).toBeInTheDocument();
  });

  it("has no trainer sections for a regular member", () => {
    renderSheet();
    for (const name of ["Trainer listing", "Verification history", "Earnings & payouts"]) {
      expect(screen.queryByRole("button", { name: new RegExp(`^${name}`) })).not.toBeInTheDocument();
    }
  });

  it("adds the trainer sections — all open too — for a trainer", () => {
    renderSheet({ detail: trainer });
    for (const name of ["Trainer listing", "Verification history", "Earnings & payouts"]) {
      expect(section(name)).toHaveAttribute("aria-expanded", "true");
    }
    const listing = screen.getByRole("region", { name: "Trainer listing" });
    expect(within(listing).getByText("Strength coach")).toBeInTheDocument();
    expect(within(listing).getByText("Active")).toBeInTheDocument();
    expect(within(listing).getByText("★ 4.8 · 12 reviews")).toBeInTheDocument();
    expect(within(listing).getByText(/NT\$1,200/)).toBeInTheDocument();
    expect(within(listing).getByText(/60 min/)).toBeInTheDocument();
    const verifications = screen.getByRole("region", { name: "Verification history" });
    expect(within(verifications).getByText("Approved")).toBeInTheDocument();
    expect(within(verifications).getByText(/Submitted/)).toBeInTheDocument();
    const earnings = screen.getByRole("region", { name: "Earnings & payouts" });
    expect(within(earnings).getByText("NT$3,200")).toBeInTheDocument();
    expect(within(earnings).getByText("1 · NT$1,000")).toBeInTheDocument();
    expect(within(earnings).getByText("NT$8,000")).toBeInTheDocument();
    expect(within(earnings).getByText("808")).toBeInTheDocument();
    expect(within(earnings).getByText("Taiwan Bank")).toBeInTheDocument();
    expect(within(earnings).getByText("Da'an")).toBeInTheDocument();
    expect(within(earnings).getByText("Tom Trainer")).toBeInTheDocument();
  });

  it("does not show how many chats a user has", () => {
    renderSheet();
    expect(screen.queryByText("Chats")).not.toBeInTheDocument();
  });

  describe("bank account number", () => {
    const row = () => screen.getByText("Account number").closest("div") as HTMLElement;

    it("starts masked — the mask is shown as it is, with no extra dots", () => {
      renderSheet({ detail: trainer });
      expect(within(row()).getByText("********1234")).toBeInTheDocument();
      expect(row().textContent).not.toContain("••••");
      expect(fetchBankAccountNumber).not.toHaveBeenCalled();
      expect(within(row()).getByRole("button", { name: "Show" })).toBeInTheDocument();
    });

    it("asks the server for the number only when Show is clicked, then reveals it", async () => {
      renderSheet({ detail: trainer });
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      expect(fetchBankAccountNumber).toHaveBeenCalledWith("u2");
      expect(await within(row()).findByText("123456780912")).toBeInTheDocument();
      expect(within(row()).queryByText("********1234")).not.toBeInTheDocument();
      expect(within(row()).getByRole("button", { name: "Hide" })).toBeInTheDocument();
    });

    it("hides it again, and drops it from the page", async () => {
      renderSheet({ detail: trainer });
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      await within(row()).findByText("123456780912");
      fireEvent.click(within(row()).getByRole("button", { name: "Hide" }));
      expect(screen.queryByText("123456780912")).not.toBeInTheDocument();
      expect(screen.getByRole("dialog").textContent).not.toContain("123456780912");
      expect(within(row()).getByText("********1234")).toBeInTheDocument();
      // showing it again asks the server again — nothing is kept
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      await within(row()).findByText("123456780912");
      expect(fetchBankAccountNumber).toHaveBeenCalledTimes(2);
    });

    it("disables the button while it loads", async () => {
      let release!: (v: string) => void;
      fetchBankAccountNumber.mockReturnValueOnce(new Promise<string>((r) => (release = r)));
      renderSheet({ detail: trainer });
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      expect(within(row()).getByRole("button", { name: "Show" })).toBeDisabled();
      release("123456780912");
      expect(await within(row()).findByText("123456780912")).toBeInTheDocument();
    });

    it("says so when it can't be revealed, keeps it masked, and lets you try again", async () => {
      fetchBankAccountNumber.mockRejectedValueOnce(new Error("forbidden"));
      renderSheet({ detail: trainer });
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      expect(await within(row()).findByRole("alert")).toHaveTextContent("Couldn't reveal it");
      expect(within(row()).getByText("********1234")).toBeInTheDocument();
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      expect(await within(row()).findByText("123456780912")).toBeInTheDocument();
    });

    it("has no Show button when the trainer has no bank account", () => {
      const none: AdminUserDetail = {
        ...trainer,
        trainer: {
          ...trainer.trainer!,
          money: {
            ...trainer.trainer!.money,
            bank_code: null,
            bank_name: null,
            branch_name: null,
            bank_account_holder: null,
            bank_account_mask: null,
            has_bank_account: false,
          },
        },
      };
      renderSheet({ detail: none });
      expect(within(row()).queryByRole("button")).not.toBeInTheDocument();
      expect(row().textContent).toContain("—");
    });

    it("forgets the number when the sheet is closed", async () => {
      const { rerender } = renderSheet({ detail: trainer });
      fireEvent.click(within(row()).getByRole("button", { name: "Show" }));
      await within(row()).findByText("123456780912");
      rerender(
        <I18nextProvider i18n={i18n("en")}>
          <UserSheet open={false} onOpenChange={() => {}} detail={trainer} loading={false} error={false} onRetry={() => {}} />
        </I18nextProvider>,
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(document.body.textContent).not.toContain("123456780912");
    });

    it("is localized", () => {
      renderSheet({ detail: trainer }, "zh");
      expect(screen.getByRole("button", { name: "顯示" })).toBeInTheDocument();
    });
  });

  it("copes with missing data and an unfinished trainer profile", () => {
    const bare: AdminUserDetail = {
      ...trainer,
      profile: { bio: null, gender: null, age: null, home_area: null, locale: null, experience_level: null, weekly_target: null },
      setup: { profile_setup_status: null, onboarding_completed: false },
      fitness: { primary_activity: null, goal: null, experience: null },
      last_sign_in_at: null,
      safety: { blocked_by_me: 0, blocked_me: 0, reports_filed: 0, reports_received: 0, consents: [] },
      trainer: {
        listing: null,
        verifications: [],
        money: { available_balance: 0, open_withdrawals_count: 0, open_withdrawals_sum: 0, total_paid_out: 0, completed_orders: 0, bank_code: null, bank_name: null, branch_name: null, bank_account_holder: null, bank_account_mask: null, has_bank_account: false },
      },
    };
    renderSheet({ detail: bare });
    expect(screen.getByText("Not shown yet")).toBeInTheDocument();
    expect(screen.getByText("No documents accepted yet")).toBeInTheDocument();
    expect(screen.getByText("This trainer hasn't created a listing yet.")).toBeInTheDocument();
    expect(screen.getByText("No verification requests")).toBeInTheDocument();
  });

  it("shows a loading state, then an error with a retry", () => {
    const retry = vi.fn();
    const { unmount } = renderSheet({ detail: null, loading: true });
    expect(screen.getByRole("dialog").querySelector("[aria-busy='true']")).not.toBeNull();
    unmount();
    renderSheet({ detail: null, error: true, onRetry: retry });
    expect(screen.getByText("Couldn't load this user.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });

  it("is read-only: no action buttons beyond the accordion headers and close", () => {
    renderSheet({ detail: trainer });
    const names = screen.getAllByRole("button").map((b) => b.textContent?.trim() ?? "");
    expect(names.some((n) => /admin/i.test(n))).toBe(false);
    expect(screen.queryByRole("button", { name: /actions/i })).not.toBeInTheDocument();
  });

  it("does not show private data", () => {
    renderSheet({ detail: { ...trainer, ...({ push_token: "secret-token", birthdate: "1997-01-01" } as object) } as AdminUserDetail });
    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).not.toContain("secret-token");
    expect(text).not.toContain("1997");
  });

  it.each(["en", "zh"] as const)("has no untranslated keys in %s", (lng) => {
    renderSheet({ detail: trainer }, lng);
    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).not.toMatch(/\b(users|dashboard|docType)\.[a-zA-Z_.]+/);
    expect(text).not.toMatch(/\{\{/);
  });

  it("renders the Chinese copy", () => {
    renderSheet({ detail: trainer }, "zh");
    for (const name of ["帳號", "個人資料", "健身檔案", "活動紀錄", "信任與安全", "陪練師刊登", "審核紀錄", "收入與撥款"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-expanded", "true");
    }
  });
});
