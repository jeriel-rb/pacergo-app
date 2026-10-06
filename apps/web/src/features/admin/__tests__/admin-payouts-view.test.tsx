import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import type { PayoutDetail, PayoutList, PayoutListRow } from "@/lib/admin";
import { AdminPayoutsView } from "../admin-payouts-view";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/en/admin/payouts",
}));

const setWithdrawalStatus = vi.fn().mockResolvedValue(undefined);
const fetchPayoutDetail = vi.fn();
const fetchBankAccountNumber = vi.fn().mockResolvedValue("123456780912");
vi.mock("../admin-actions", () => ({
  setWithdrawalStatus: (...a: unknown[]) => setWithdrawalStatus(...a),
  fetchPayoutDetail: (...a: unknown[]) => fetchPayoutDetail(...a),
  fetchBankAccountNumber: (...a: unknown[]) => fetchBankAccountNumber(...a),
}));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));

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

const row = (over: Partial<PayoutListRow>): PayoutListRow => ({
  id: "p1",
  trainer_id: "t1",
  trainer_name: "Alice Chen",
  amount: 1200,
  bank_account_mask: "********0912",
  status: "requested",
  requested_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  ...over,
});

const LIST: PayoutList = {
  rows: [
    row({}),
    row({ id: "p2", trainer_name: "Bob Lin", amount: 800, status: "paid" }),
    row({ id: "p3", trainer_name: "Cara Wu", amount: 500, status: "processing", bank_account_mask: null }),
  ],
  totals: {
    requested_count: 1,
    requested_sum: 1200,
    processing_count: 1,
    processing_sum: 500,
    paid_count: 4,
    paid_sum: 9800,
  },
};

const detailOf = (r: PayoutListRow): PayoutDetail => ({
  ...r,
  reason_note: null,
  settled_at: null,
  bank_code: "822",
  bank_name: "CTBC",
  branch_name: "Da'an",
  bank_account_number: null,
  bank_account_holder: "Alice Chen",
  history: [
    { actor_id: null, from_status: null, to_status: "requested", reason_note: null, actor_name: null, created_at: "2026-10-01T00:00:00Z" },
    { actor_id: "a1", from_status: "requested", to_status: "processing", reason_note: "checked", actor_name: "Admin Amy", created_at: "2026-10-02T00:00:00Z" },
  ],
});

function renderView(lng: "en" | "zh" = "en", list = LIST) {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <AdminPayoutsView initial={list} initialFilter="all" />
    </I18nextProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchPayoutDetail.mockImplementation(async (id: string) =>
    detailOf(LIST.rows.find((r) => r.id === id)!),
  );
  fetchBankAccountNumber.mockResolvedValue("123456780912");
});

describe("AdminPayoutsView", () => {
  it("keeps the requested and processing totals as two cards above the table", () => {
    renderView();
    const table = screen.getByRole("table");
    const cardOf = (label: string) =>
      screen
        .getAllByText(label)
        .find((el) => !table.contains(el) && el.tagName === "P")!
        .parentElement as HTMLElement;
    const requested = cardOf("Requested");
    expect(within(requested).getByText("NT$1,200")).toBeInTheDocument();
    expect(within(requested).getByText("1 requests")).toBeInTheDocument();
    const processing = cardOf("Processing");
    expect(within(processing).getByText("NT$500")).toBeInTheDocument();
  });

  it("also shows the total that has been paid, as a third card", () => {
    renderView();
    const table = screen.getByRole("table");
    const label = screen.getAllByText("Paid").find((el) => !table.contains(el) && el.tagName === "P")!;
    const card = label.parentElement as HTMLElement;
    expect(within(card).getByText("NT$9,800")).toBeInTheDocument();
    expect(within(card).getByText("4 requests")).toBeInTheDocument();
  });

  it("leaves the Paid card out when the database doesn't return a paid total yet", () => {
    renderView("en", {
      ...LIST,
      totals: { requested_count: 1, requested_sum: 1200, processing_count: 1, processing_sum: 500 },
    });
    const table = screen.getByRole("table");
    expect(screen.getAllByText("Paid").filter((el) => !table.contains(el) && el.tagName === "P")).toHaveLength(0);
    expect(screen.queryByText("NT$0")).not.toBeInTheDocument();
  });

  it("lists payouts in a table with the shared search and status filter", () => {
    renderView();
    expect(screen.getByRole("table")).toBeInTheDocument();
    for (const h of ["Trainer", "Amount", "Bank account", "Status", "Requested", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveTextContent("All");
    const aliceRow = screen.getByText("Alice Chen").closest("tr")!;
    expect(within(aliceRow).getByText("NT$1,200")).toBeInTheDocument();
    // the account column keeps the server's asterisk mask, in the sheet's monospace style
    const mask = within(aliceRow).getByText("********0912");
    expect(mask.className).toContain("font-mono");
    const caraRow = screen.getByText("Cara Wu").closest("tr")!;
    expect(within(caraRow).getAllByText("—").length).toBeGreaterThan(0); // no account on file
    expect(within(aliceRow).getByText("Requested")).toBeInTheDocument();
  });

  it("searches by trainer name", () => {
    renderView();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bob" } });
    expect(screen.getByText("Bob Lin")).toBeInTheDocument();
    expect(screen.queryByText("Alice Chen")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nobody" } });
    expect(screen.getByText("No payouts match your search.")).toBeInTheDocument();
  });

  it("changing the status filter reloads the list through the URL", () => {
    renderView();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter by status" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Paid" }));
    expect(push).toHaveBeenCalledWith("/en/admin/payouts?status=paid");
  });

  it("opens the payout in a side sheet by clicking its row — no page navigation, no menu item for it", async () => {
    renderView();
    fireEvent.click(screen.getByText("Bob Lin").closest("tr")!);
    const sheet = await screen.findByRole("dialog");
    await waitFor(() => expect(fetchPayoutDetail).toHaveBeenCalledWith("p2"));
    expect(await within(sheet).findByText("Bank account")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.keyDown(sheet, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(menuOf("Bob Lin")).not.toContain("View details");
  });

  it("the sheet lists the payout, bank details (account masked) and status history", async () => {
    renderView();
    fireEvent.click(screen.getByText("Alice Chen").closest("tr")!);
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByText("CTBC");
    for (const t of ["Payout", "Bank account", "Status history"]) {
      expect(within(sheet).getByRole("button", { name: new RegExp(t) })).toBeInTheDocument();
    }
    expect(within(sheet).getByText("822")).toBeInTheDocument();
    expect(within(sheet).getByText("********0912")).toBeInTheDocument();
    expect(within(sheet).queryByText("123456780912")).not.toBeInTheDocument();
    expect(within(sheet).getByText(/Admin Amy · .*checked/)).toBeInTheDocument();
  });

  it("reveals the full account number only on Show, and hides it again", async () => {
    renderView();
    fireEvent.click(screen.getByText("Alice Chen").closest("tr")!);
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByText("CTBC");
    fireEvent.click(within(sheet).getByRole("button", { name: "Show" }));
    expect(await within(sheet).findByText("123456780912")).toBeInTheDocument();
    expect(fetchBankAccountNumber).toHaveBeenCalledWith("t1"); // by the trainer's id
    fireEvent.click(within(sheet).getByRole("button", { name: "Hide" }));
    expect(within(sheet).queryByText("123456780912")).not.toBeInTheDocument();
  });

  it("offers a retry when the details can't be loaded", async () => {
    fetchPayoutDetail.mockRejectedValueOnce(new Error("x"));
    renderView();
    fireEvent.click(screen.getByText("Alice Chen").closest("tr")!);
    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("Couldn't load this payout.")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Try again" }));
    expect(await within(sheet).findByText("CTBC")).toBeInTheDocument();
  });

  /** Open a row's "⋯" menu and return its item names. */
  function menuOf(name: string): string[] {
    const r = screen.getByText(name).closest("tr")!;
    fireEvent.click(within(r).getByRole("button", { name: "Payout actions" }));
    return screen.getAllByRole("menuitem").map((i) => i.textContent!);
  }

  it("menu: a requested payout can be marked processing, rejected or cancelled", () => {
    renderView();
    expect(menuOf("Alice Chen")).toEqual(["Mark Processing", "Reject", "Cancel"]);
  });

  it("menu: a paid payout only opens its details", async () => {
    renderView();
    expect(menuOf("Bob Lin")).toEqual(["See details"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "See details" }));
    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("CTBC")).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Mark Processing" })).not.toBeInTheDocument();
  });

  it("menu: offers only the changes that are valid from each status", () => {
    renderView();
    expect(menuOf("Cara Wu")).toEqual([
      "Mark Paid",
      "Reject",
      "Cancel",
      "Revert to Requested",
    ]);
  });

  it("marks a payout processing after confirming, with no reason needed", async () => {
    renderView();
    menuOf("Alice Chen");
    fireEvent.click(screen.getByRole("menuitem", { name: "Mark Processing" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Alice Chen · NT$1,200")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark Processing" }));
    await waitFor(() =>
      expect(setWithdrawalStatus).toHaveBeenCalledWith("p1", "processing", ""),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("rejecting needs a reason, then records it", async () => {
    renderView();
    menuOf("Alice Chen");
    fireEvent.click(screen.getByRole("menuitem", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    expect(screen.getByText("This action requires a reason note.")).toBeInTheDocument();
    expect(setWithdrawalStatus).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "wrong account" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(setWithdrawalStatus).toHaveBeenCalledWith("p1", "rejected", "wrong account"),
    );
  });

  it("shows an empty state", () => {
    renderView("en", { ...LIST, rows: [] });
    expect(screen.getByText("No withdrawal requests match this filter.")).toBeInTheDocument();
  });

  it.each(["en", "zh"] as const)("has no untranslated keys in %s", (lng) => {
    const { container } = renderView(lng);
    expect(container.textContent).not.toMatch(/\bpayouts\.[a-zA-Z_.]+/);
  });
});
