import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import type { AdminUsersPage, AdminVerification, PayoutList } from "@/lib/admin";
import { AdminDashboardView } from "../admin-dashboard-view";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => "/en/admin",
}));

const reviewVerification = vi.fn().mockResolvedValue(undefined);
const fetchUsersPage = vi.fn();
const setWithdrawalStatus = vi.fn().mockResolvedValue(undefined);
const setUserAdmin = vi.fn().mockResolvedValue(undefined);
const fetchUserDetail = vi.fn();
vi.mock("../../admin-actions", () => ({
  MEMBERS_PAGE_SIZE: 12,
  setWithdrawalStatus: (...a: unknown[]) => setWithdrawalStatus(...a),
  reviewVerification: (...a: unknown[]) => reviewVerification(...a),
  fetchUsersPage: (...a: unknown[]) => fetchUsersPage(...a),
  setUserAdmin: (...a: unknown[]) => setUserAdmin(...a),
  fetchUserDetail: (...a: unknown[]) => fetchUserDetail(...a),
  getCertSignedUrl: vi.fn().mockResolvedValue("https://example.test/doc.pdf"),
}));

const toastShow = vi.fn();
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: toastShow }) }));

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

const verification = (over: Partial<AdminVerification>): AdminVerification => ({
  id: "v1",
  user_id: "u1",
  display_name: "Alice Chen",
  photo_url: null,
  doc_type: "certification",
  activity: "fitness",
  label: "NASM-CPT",
  document_path: "u1/doc.pdf",
  status: "pending",
  notes: null,
  created_at: "2026-10-01T00:00:00Z",
  reviewed_at: null,
  ...over,
});

const queue: AdminVerification[] = [
  verification({ id: "v1", display_name: "Alice Chen" }),
  verification({ id: "v2", display_name: "Bob Lin", status: "approved", reviewed_at: "2026-10-02T00:00:00Z" }),
  verification({ id: "v3", display_name: "Cara Wu", status: "rejected", reviewed_at: "2026-10-03T00:00:00Z" }),
];

const usersPage: AdminUsersPage = {
  total: 3,
  users: [
    { id: "a", display_name: "Admin Amy", photo_url: null, email: "amy@x.test", is_companion: false, is_admin: true, created_at: "2026-09-01T00:00:00Z" },
    { id: "b", display_name: "Trainer Tom", photo_url: null, email: "tom@x.test", is_companion: true, is_admin: false, created_at: "2026-09-02T00:00:00Z" },
    { id: "c", display_name: "Member Mia", photo_url: null, email: "mia@x.test", is_companion: false, is_admin: false, created_at: "2026-09-03T00:00:00Z" },
  ],
};

const emptyTotals = { requested_count: 0, requested_sum: 0, processing_count: 0, processing_sum: 0 };

const payouts: PayoutList = {
  totals: { requested_count: 1, requested_sum: 3000, processing_count: 1, processing_sum: 1500 },
  rows: [
    { id: "p1", trainer_id: "t", trainer_name: "Trainer Tom", amount: 3000, bank_account_mask: "1234", status: "requested", requested_at: "2026-10-04T00:00:00Z", updated_at: "2026-10-04T00:00:00Z" },
    { id: "p2", trainer_id: "t", trainer_name: "Trainer Tom", amount: 1500, bank_account_mask: "1234", status: "processing", requested_at: "2026-10-03T00:00:00Z", updated_at: "2026-10-03T00:00:00Z" },
    { id: "p3", trainer_id: "t", trainer_name: "Dana Ho", amount: 4000, bank_account_mask: "9876", status: "paid", requested_at: "2026-09-20T00:00:00Z", updated_at: "2026-09-25T00:00:00Z" },
    { id: "p4", trainer_id: "t", trainer_name: "Dana Ho", amount: 800, bank_account_mask: "9876", status: "rejected", requested_at: "2026-09-10T00:00:00Z", updated_at: "2026-09-11T00:00:00Z" },
  ],
};

const stats = { total_users: 42, total_trainers: 10, total_admins: 2, new_users_30d: 7 };

function renderView(lng: "en" | "zh" = "en", props: Partial<Parameters<typeof AdminDashboardView>[0]> = {}) {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <AdminDashboardView stats={stats} queue={queue} usersPage={usersPage} payouts={payouts} {...props} />
    </I18nextProvider>,
  );
}

/** The KPI card whose title is `title` (a stat card is a padded, gapped flex column). */
function statCard(title: string): HTMLElement {
  const el = screen
    .getAllByText(title)
    .map((n) => n.closest("div[class*='gap-3'][class*='p-5']"))
    .find(Boolean);
  if (!el) throw new Error(`no card titled ${title}`);
  return el as HTMLElement;
}

/** A dashboard panel (card) by its heading. */
function panel(heading: string): HTMLElement {
  return screen.getByRole("heading", { name: heading }).closest("div[class*='p-5']") as HTMLElement;
}

const userDetail = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  display_name: "Detail Person",
  photo_url: null,
  email: "detail@x.test",
  email_confirmed: true,
  is_admin: false,
  is_companion: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: null,
  last_sign_in_at: null,
  profile: { bio: null, gender: null, age: null, home_area: "Taipei", locale: "en", experience_level: null, weekly_target: null },
  setup: { profile_setup_status: null, onboarding_completed: false },
  fitness: { primary_activity: null, goal: null, experience: null },
  activity: { bookings_made: 0, bookings_received: 0, reviews_given: 0, saved_trainers: 0 },
  safety: { blocked_by_me: 0, blocked_me: 0, reports_filed: 0, reports_received: 0, consents: [] },
  trainer: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchUserDetail.mockImplementation(async (id: string) => userDetail(id));
});

describe("AdminDashboardView — layout", () => {
  it("puts the KPI cards and users table on the left, requests and payouts on the right", () => {
    renderView();
    const grid = screen.getByRole("heading", { name: "Dashboard" }).nextElementSibling as HTMLElement;
    // lg+: a 24-column grid that fills the viewport height (the page doesn't scroll).
    expect(grid.className).toContain("lg:grid-cols-24");
    expect(grid.className).toContain("lg:flex-1");
    expect((grid.parentElement as HTMLElement).className).toContain("lg:h-full");
    const [left, right] = Array.from(grid.children) as HTMLElement[];
    expect(within(left!).getByText("Total users")).toBeInTheDocument();
    expect(within(left!).getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(within(right!).getByRole("heading", { name: "Trainer requests" })).toBeInTheDocument();
    expect(within(right!).getByRole("heading", { name: "Payouts" })).toBeInTheDocument();
  });

  it("lays the four KPI cards out two per row", () => {
    renderView();
    const grid = statCard("Total users").parentElement as HTMLElement;
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.children).toHaveLength(4);
  });
});

describe("AdminDashboardView — KPI cards", () => {
  it("shows the headline numbers", () => {
    renderView();
    expect(within(statCard("Total users")).getByText("42")).toBeInTheDocument();
    expect(screen.getByText("+7 in the last 30 days")).toBeInTheDocument();
    expect(within(statCard("Trainers")).getByText("10")).toBeInTheDocument();
    expect(screen.getByText("24% of all users")).toBeInTheDocument();
    expect(within(statCard("Pending trainer requests")).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1 approved · 1 rejected")).toBeInTheDocument();
    // open payouts = requested 3000 + processing 1500
    expect(within(statCard("Open payouts")).getByText("NT$4,500")).toBeInTheDocument();
    expect(screen.getByText("2 awaiting transfer")).toBeInTheDocument();
  });

  it("falls back gracefully when the stats RPC is unavailable", () => {
    renderView("en", { stats: null });
    expect(within(statCard("Total users")).getByText("3")).toBeInTheDocument();
    expect(within(statCard("Trainers")).getByText("—")).toBeInTheDocument();
  });
});

describe("AdminDashboardView — trainer requests card", () => {
  it("is just a title and the pending requests (no subtitle, no tabs)", () => {
    renderView();
    const card = panel("Trainer requests");
    expect(within(card).getByText("Alice Chen")).toBeInTheDocument();
    // decided requests are not listed here
    expect(within(card).queryByText("Bob Lin")).not.toBeInTheDocument();
    expect(within(card).queryByText("Cara Wu")).not.toBeInTheDocument();
    expect(within(card).queryByText(/pending review/)).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Pending|Approved|Rejected/ })).not.toBeInTheDocument();
  });

  it("offers view / approve / reject on each request", () => {
    renderView();
    const card = panel("Trainer requests");
    expect(within(card).getByRole("button", { name: /View document/ })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("approving confirms in a dialog, calls the RPC with the note, then refreshes", async () => {
    renderView();
    fireEvent.click(within(panel("Trainer requests")).getByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Approve this request?")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " looks good " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(reviewVerification).toHaveBeenCalledWith("v1", "approved", "looks good"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastShow).toHaveBeenCalledWith("Verification approved", "success");
  });

  it("rejecting sends the rejected status with the note", async () => {
    renderView();
    fireEvent.click(within(panel("Trainer requests")).getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "blurry" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(reviewVerification).toHaveBeenCalledWith("v1", "rejected", "blurry"));
  });

  it("keeps the dialog open and reports a failed review", async () => {
    reviewVerification.mockRejectedValueOnce(new Error("forbidden"));
    renderView();
    fireEvent.click(within(panel("Trainer requests")).getByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(toastShow).toHaveBeenCalledWith(expect.stringContaining("Couldn't update"), "destructive"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a centered empty message when nothing is pending", () => {
    renderView("en", { queue: queue.filter((v) => v.status !== "pending") });
    expect(within(panel("Trainer requests")).getByText("No trainer requests pending review")).toBeInTheDocument();
  });
});

describe("AdminDashboardView — users table", () => {
  it("renders users with role badges", () => {
    renderView();
    const table = screen.getByText("Admin Amy").closest("table")!;
    // Each role shows once in the Role column and once under the name (small screens).
    expect(within(table).getAllByText("Admin").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Trainer").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Member").length).toBeGreaterThan(0);
    expect(within(table).getByText("tom@x.test")).toBeInTheDocument();
  });

  it("left-aligns every column header, including Actions, and does not scroll", () => {
    renderView();
    const table = screen.getByText("Admin Amy").closest("table")!;
    for (const th of Array.from(table.querySelectorAll("th"))) {
      expect(th.className).not.toContain("text-right");
    }
    expect(within(table).getByText("Actions")).toBeInTheDocument();
    // the table is not inside a scrolling / height-capped box
    const frame = table.parentElement as HTMLElement;
    expect(frame.className).not.toMatch(/overflow-y|max-h/);
  });

  it("keeps a fixed number of rows: a short page is padded with empty filler rows", () => {
    renderView();
    const table = screen.getByText("Admin Amy").closest("table")!;
    const body = table.querySelector("tbody")!;
    const rows = Array.from(body.querySelectorAll("tr"));
    expect(rows).toHaveLength(12); // page size
    const filler = rows.filter((r) => r.getAttribute("aria-hidden") === "true");
    expect(filler).toHaveLength(12 - usersPage.users.length);
    for (const r of filler) expect(r.textContent).toBe("");
    // every row has the same fixed height
    for (const r of rows) expect(r.className).toContain("h-[61px]");
  });

  it("does not pad when there are no users to show", () => {
    renderView("en", { usersPage: { users: [], total: 0 } });
    expect(screen.getByText("No members yet.")).toBeInTheDocument();
    expect(document.querySelectorAll("tr[aria-hidden='true']")).toHaveLength(0);
  });

  it("opens a user's details in a sheet when their row is clicked", async () => {
    renderView();
    fireEvent.click(screen.getByText("tom@x.test").closest("tr")!);
    const sheet = await screen.findByRole("dialog");
    expect(fetchUserDetail).toHaveBeenCalledWith("b");
    expect(await within(sheet).findByText("Detail Person", { selector: "h2" })).toBeInTheDocument();
    // every accordion section starts open
    const headers = within(sheet).getAllByRole("button", { name: /^(Account|Profile|Fitness profile|Activity|Trust & safety)/ });
    expect(headers).toHaveLength(5);
    for (const h of headers) expect(h).toHaveAttribute("aria-expanded", "true");
  });

  it("opens the sheet from the keyboard", async () => {
    renderView();
    fireEvent.keyDown(screen.getByText("Member Mia").closest("tr")!, { key: "Enter" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(fetchUserDetail).toHaveBeenCalledWith("c");
  });

  it("the make / revoke admin button does not open the sheet", async () => {
    renderView();
    const row = screen.getByText("Member Mia").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Make admin" }));
    await waitFor(() => expect(setUserAdmin).toHaveBeenCalledWith("c", true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchUserDetail).not.toHaveBeenCalled();
  });

  it("shows a trainer's extra sections when the opened user is a trainer", async () => {
    fetchUserDetail.mockResolvedValueOnce(
      userDetail("b", {
        is_companion: true,
        trainer: {
          listing: null,
          verifications: [],
          money: { available_balance: 0, open_withdrawals_count: 0, open_withdrawals_sum: 0, total_paid_out: 0, completed_orders: 0, bank_code: null, bank_name: null, branch_name: null, bank_account_holder: null, bank_account_mask: null, has_bank_account: false },
        },
      }),
    );
    renderView();
    fireEvent.click(screen.getByText("tom@x.test").closest("tr")!);
    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByRole("button", { name: /^Earnings & payouts/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("offers a retry when the details can't be loaded", async () => {
    fetchUserDetail.mockRejectedValueOnce(new Error("boom"));
    renderView();
    fireEvent.click(screen.getByText("tom@x.test").closest("tr")!);
    expect(await screen.findByText("Couldn't load this user.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Detail Person", { selector: "h2" })).toBeInTheDocument();
    expect(fetchUserDetail).toHaveBeenCalledTimes(2);
  });

  it("uses the same compact toolbar as the orders and trainer requests tables", () => {
    renderView();
    const search = screen.getByRole("searchbox").parentElement as HTMLElement;
    expect(search.className).toContain("sm:w-80");
    expect(search.className).not.toContain("flex-1");
    const role = screen.getByRole("combobox", { name: "Filter by role" });
    expect(role.className).toContain("sm:w-48");
    expect(role.className).toContain("justify-start");
  });

  it("searching asks the server (debounced) for the first page", async () => {
    fetchUsersPage.mockResolvedValue({ users: [], total: 0 });
    renderView();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tom" } });
    await waitFor(() => expect(fetchUsersPage).toHaveBeenCalledWith(0, "tom", undefined, 12), { timeout: 1500 });
    expect(await screen.findByText("No members match your search.")).toBeInTheDocument();
  });
});

describe("AdminDashboardView — payouts card", () => {
  it("is just a title and the payouts that still need an admin", () => {
    renderView();
    const card = panel("Payouts");
    // requested + processing only; paid and rejected are not listed
    expect(within(card).getAllByRole("listitem")).toHaveLength(2);
    expect(within(card).getByText("NT$3,000")).toBeInTheDocument();
    expect(within(card).getByText("NT$1,500")).toBeInTheDocument();
    expect(within(card).queryByText("NT$4,000")).not.toBeInTheDocument();
    expect(within(card).queryByText("NT$800")).not.toBeInTheDocument();
    // no totals tiles, no status dropdown, no subtitle
    expect(within(card).queryByText("Paid out")).not.toBeInTheDocument();
    expect(within(card).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(card).queryByText(/awaiting transfer/)).not.toBeInTheDocument();
  });

  it("links the trainer name to the payout detail page", () => {
    renderView();
    const link = within(panel("Payouts")).getAllByRole("link")[0]!;
    expect(link.getAttribute("href")).toMatch(/\/admin\/payouts\/p1$/);
  });

  it("moves a requested payout forward to processing after confirming", async () => {
    renderView();
    const first = within(panel("Payouts")).getAllByRole("listitem")[0]!;
    fireEvent.click(within(first).getByRole("button", { name: "Mark Processing" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Trainer Tom · NT$3,000")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark Processing" }));
    await waitFor(() => expect(setWithdrawalStatus).toHaveBeenCalledWith("p1", "processing", ""));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastShow).toHaveBeenCalledWith("Payout status updated", "success");
  });

  it("marks a processing payout as paid", async () => {
    renderView();
    const second = within(panel("Payouts")).getAllByRole("listitem")[1]!;
    fireEvent.click(within(second).getByRole("button", { name: "Mark Paid" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark Paid" }));
    await waitFor(() => expect(setWithdrawalStatus).toHaveBeenCalledWith("p2", "paid", ""));
  });

  it("will not reject without a reason, and sends it when given", async () => {
    renderView();
    const first = within(panel("Payouts")).getAllByRole("listitem")[0]!;
    fireEvent.click(within(first).getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    expect(await within(dialog).findByText("This action requires a reason note.")).toBeInTheDocument();
    expect(setWithdrawalStatus).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "bank mismatch" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(setWithdrawalStatus).toHaveBeenCalledWith("p1", "rejected", "bank mismatch"));
  });

  it("reports a failed update and keeps the dialog open", async () => {
    setWithdrawalStatus.mockRejectedValueOnce(new Error("withdrawal_not_found"));
    renderView();
    const first = within(panel("Payouts")).getAllByRole("listitem")[0]!;
    fireEvent.click(within(first).getByRole("button", { name: "Mark Processing" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark Processing" }));
    await waitFor(() =>
      expect(toastShow).toHaveBeenCalledWith(expect.stringContaining("Couldn't update"), "destructive"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows an empty message when nothing is pending", () => {
    renderView("en", { payouts: { rows: payouts.rows.filter((r) => r.status === "paid"), totals: emptyTotals } });
    expect(within(panel("Payouts")).getByText("No payout requests pending")).toBeInTheDocument();
  });
});

describe("AdminDashboardView — empty and localized", () => {
  it("shows empty states with no data at all", () => {
    renderView("en", {
      stats: null,
      queue: [],
      usersPage: { users: [], total: 0 },
      payouts: { rows: [], totals: emptyTotals },
    });
    expect(screen.getByText("No trainer requests pending review")).toBeInTheDocument();
    expect(screen.getByText("No members yet.")).toBeInTheDocument();
    expect(screen.getByText("No payout requests pending")).toBeInTheDocument();
  });

  it.each(["en", "zh"] as const)("has no untranslated keys in %s", (lng) => {
    const { container } = renderView(lng);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\b(dashboard|pagination|payouts|docType)\.[a-zA-Z_.]+/);
    expect(text).not.toMatch(/\{\{/);
  });

  it("renders the Chinese copy", () => {
    renderView("zh");
    expect(screen.getByRole("heading", { name: "儀表板" })).toBeInTheDocument();
    expect(screen.getByText("總使用者數")).toBeInTheDocument();
    expect(screen.getByText("近 30 天新增 7 位")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "陪練師申請" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "撥款" })).toBeInTheDocument();
  });
});
