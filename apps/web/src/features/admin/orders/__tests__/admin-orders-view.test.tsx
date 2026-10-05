import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import type { AdminOrderDetail, AdminOrderRow } from "@/lib/admin";
import { AdminOrdersView } from "../admin-orders-view";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
  usePathname: () => "/en/admin/orders",
}));

const fetchOrderDetail = vi.fn();
const setPaymentStatus = vi.fn().mockResolvedValue(undefined);
const setPaymentHold = vi.fn().mockResolvedValue(undefined);
const correctServiceCompleted = vi.fn().mockResolvedValue(undefined);
vi.mock("../../admin-actions", () => ({
  fetchOrderDetail: (...a: unknown[]) => fetchOrderDetail(...a),
  setPaymentStatus: (...a: unknown[]) => setPaymentStatus(...a),
  setPaymentHold: (...a: unknown[]) => setPaymentHold(...a),
  correctServiceCompleted: (...a: unknown[]) => correctServiceCompleted(...a),
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

const row = (over: Partial<AdminOrderRow>): AdminOrderRow => ({
  id: "o1",
  booking_id: "b1",
  seeker_name: "Alice",
  companion_name: "Bob",
  amount: 1200,
  provider: "simulated",
  status: "paid",
  refund_status: "none",
  settlement_status: "unsettled",
  admin_hold: false,
  created_at: "2026-10-01T08:00:00Z",
  ...over,
});

const detail = (over: Partial<AdminOrderDetail> = {}): AdminOrderDetail => ({
  id: "o1",
  booking_id: "b1",
  seeker_name: "Alice",
  companion_name: "Bob",
  activity_slug: "gym",
  scheduled_start: null,
  amount: 1200,
  currency: "TWD",
  provider: "simulated",
  merchant_order_no: "PG-1001",
  status: "paid",
  refund_status: "none",
  platform_fee_amount: 120,
  processing_fee_amount: 36,
  trainer_payable: 1044,
  settlement_eligibility_status: "eligible",
  settlement_status: "unsettled",
  service_completed_at: null,
  settlement_hold_until: null,
  admin_hold: false,
  admin_hold_reason: null,
  created_at: "2026-10-01T08:00:00Z",
  history: [
    { event_type: "admin_hold_set", from_value: null, to_value: "true", reason_note: "chargeback risk", actor_name: "Admin Amy", created_at: "2026-10-02T09:00:00Z" },
    { event_type: "service_completed_auto", from_value: null, to_value: null, reason_note: null, actor_name: null, created_at: "2026-10-03T09:00:00Z" },
  ],
  ...over,
});

const ROWS: AdminOrderRow[] = [
  row({ id: "o1" }), // paid, open
  row({ id: "o2", seeker_name: "Cara", companion_name: "Dan", amount: 800, status: "created", provider: "newebpay" }),
  row({ id: "o3", seeker_name: "Eve", companion_name: "Fay", amount: 500, status: "paid", settlement_status: "paid" }),
  row({ id: "o4", seeker_name: "Gus", companion_name: "Hal", amount: 300, status: "paid", refund_status: "refund_requested", admin_hold: true }),
];

function renderView(lng: "en" | "zh" = "en", rows = ROWS, filter: "all" | "paid" = "all") {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <AdminOrdersView rows={rows} filter={filter} />
    </I18nextProvider>,
  );
}

const orderRow = (people: string) => screen.getByText(people).closest("tr") as HTMLElement;

async function openMenu(people: string) {
  const r = orderRow(people);
  fireEvent.click(within(r).getByRole("button", { name: "Order actions" }));
  return screen.findByRole("menu");
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchOrderDetail.mockImplementation(async (id: string) => detail({ id }));
});

describe("AdminOrdersView — table", () => {
  it("shows one status pill per order — a refund or hold replaces 'Paid'", () => {
    renderView();
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getAllByRole("row")).toHaveLength(1 + ROWS.length);
    expect(within(orderRow("Alice → Bob")).getByText("NT$1,200")).toBeInTheDocument();
    expect(within(orderRow("Alice → Bob")).getByText("Paid")).toBeInTheDocument();
    expect(within(orderRow("Cara → Dan")).getByText("Created")).toBeInTheDocument();
    // refund requested (and held): just "Refund requested" — not "Paid", not "On hold"
    const flagged = orderRow("Gus → Hal");
    expect(within(flagged).getByText("Refund requested")).toBeInTheDocument();
    expect(within(flagged).queryByText("Paid")).not.toBeInTheDocument();
    expect(within(flagged).queryByText("On hold")).not.toBeInTheDocument();
  });

  it("a held order shows 'On hold' instead of its payment status", () => {
    renderView("en", [row({ id: "h1", seeker_name: "Ida", companion_name: "Jon", admin_hold: true })]);
    const held = orderRow("Ida → Jon");
    expect(within(held).getByText("On hold")).toBeInTheDocument();
    expect(within(held).queryByText("Paid")).not.toBeInTheDocument();
  });

  it("shows payments as manual transfers made outside the platform", () => {
    renderView();
    expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
    expect(within(orderRow("Alice → Bob")).getByText("Manual transfer")).toBeInTheDocument();
    expect(within(orderRow("Cara → Dan")).getByText("Manual transfer")).toBeInTheDocument();
  });

  it("keeps every column header and a ⋯ action menu on each row", () => {
    renderView();
    for (const h of ["Order", "Amount", "Status", "Payment method", "Created", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Order actions" })).toHaveLength(ROWS.length);
  });

  it("filters by status with a dropdown (no pill tabs)", () => {
    renderView("en", ROWS, "paid");
    expect(screen.queryByRole("link", { name: "Pending" })).not.toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Filter by status" });
    expect(select).toHaveTextContent("Paid");
    fireEvent.keyDown(select, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Refund requested" }));
    expect(push).toHaveBeenCalledWith("/en/admin/orders?status=refund_requested");
  });

  it("picking 'All' goes back to the unfiltered list", () => {
    renderView("en", ROWS, "paid");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter by status" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "All" }));
    expect(push).toHaveBeenCalledWith("/en/admin/orders");
  });

  it("searches by member or trainer name", () => {
    renderView();
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "dan" } });
    expect(screen.getByText("Cara → Dan")).toBeInTheDocument();
    expect(screen.queryByText("Alice → Bob")).not.toBeInTheDocument();
    // either side of the order matches, ignoring case
    fireEvent.change(search, { target: { value: "ALICE" } });
    expect(screen.getByText("Alice → Bob")).toBeInTheDocument();
    expect(screen.queryByText("Cara → Dan")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.getByText("No orders match your search.")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getAllByRole("row")).toHaveLength(1 + ROWS.length);
  });

  it("goes back to the first page and recounts when searching", () => {
    const many = Array.from({ length: 23 }, (_, i) =>
      row({ id: `m${i}`, seeker_name: i === 21 ? "Techno Spark" : `S${i}`, companion_name: `T${i}` }),
    );
    renderView("en", many);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "techno" } });
    expect(screen.getByText("Techno Spark → T21")).toBeInTheDocument();
    expect(screen.getByText("1 total")).toBeInTheDocument();
  });

  it("uses a short search placeholder", () => {
    renderView();
    expect(screen.getByPlaceholderText("Search by name…")).toBeInTheDocument();
  });

  it("keeps the status dropdown's icon and label together, only the chevron pushed right", () => {
    renderView();
    const select = screen.getByRole("combobox", { name: "Filter by status" });
    expect(select.className).toContain("sm:w-48"); // same width on every table
    expect(select.className).toContain("justify-start");
    expect(select.className).toContain("[&>svg:last-child]:ml-auto");
  });

  it("keeps the search field compact, not stretched across the page", () => {
    renderView();
    const search = screen.getByRole("searchbox").parentElement as HTMLElement;
    expect(search.className).toContain("sm:w-80");
    expect(search.className).not.toContain("flex-1");
  });

  it("shows an empty message when there are no orders", () => {
    renderView("en", []);
    expect(screen.getByText("No orders match this filter.")).toBeInTheDocument();
  });

  it("pages through long lists", () => {
    const many = Array.from({ length: 23 }, (_, i) =>
      row({ id: `m${i}`, seeker_name: `S${i}`, companion_name: `T${i}` }),
    );
    renderView("en", many);
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getAllByRole("row")).toHaveLength(11); // header + 10
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("S10 → T10")).toBeInTheDocument();
    expect(screen.getByText("23 total")).toBeInTheDocument();
  });
});

describe("AdminOrdersView — detail sheet", () => {
  it("opens the order's details in a sheet when a row is clicked", async () => {
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    const sheet = await screen.findByRole("dialog");
    expect(fetchOrderDetail).toHaveBeenCalledWith("o1");
    expect(await within(sheet).findByText("PG-1001")).toBeInTheDocument();
    expect(within(sheet).getByText("NT$1,200")).toBeInTheDocument();
    expect(within(sheet).getByText("NT$120")).toBeInTheDocument(); // platform fee
    expect(within(sheet).getByText("NT$1,044")).toBeInTheDocument(); // trainer payable
    expect(within(sheet).getByText("Not completed")).toBeInTheDocument();
  });

  it("shows the ledger history as a table", async () => {
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByText("PG-1001");
    const history = within(sheet).getByText("History").closest("section")!.querySelector("table")!;
    for (const h of ["Event", "By", "When", "Note"]) {
      expect(within(history).getByRole("columnheader", { name: h })).toBeInTheDocument();
    }
    const rows = within(history).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 events
    expect(within(rows[1]!).getByText("Hold placed")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Admin Amy")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("chargeback risk")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Service completed (automatic)")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("System")).toBeInTheDocument();
  });

  it("says so when an order has no history yet", async () => {
    fetchOrderDetail.mockResolvedValueOnce(detail({ history: [] }));
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    expect(await screen.findByText("No ledger events yet.")).toBeInTheDocument();
  });

  it("opens from the keyboard", async () => {
    renderView();
    fireEvent.keyDown(orderRow("Alice → Bob"), { key: "Enter" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows an error with a retry when the details can't be loaded", async () => {
    fetchOrderDetail.mockRejectedValueOnce(new Error("boom"));
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    expect(await screen.findByText("Couldn't load this order.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("PG-1001")).toBeInTheDocument();
    expect(fetchOrderDetail).toHaveBeenCalledTimes(2);
  });

  it("clicking the ⋯ menu does not open the sheet", async () => {
    renderView();
    await openMenu("Alice → Bob");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("AdminOrdersView — ⋯ action menu", () => {
  const labels = async () =>
    (await screen.findAllByRole("menuitem")).map((i) => i.textContent);

  it("offers refund, hold and — once details load — service completed for a paid order", async () => {
    renderView();
    await openMenu("Alice → Bob");
    await waitFor(async () =>
      expect(await labels()).toEqual(["Request refund", "Place hold", "Mark service completed"]),
    );
  });

  it("offers 'clear service completed' when the service is already marked done", async () => {
    fetchOrderDetail.mockResolvedValueOnce(detail({ service_completed_at: "2026-10-03T09:00:00Z" }));
    renderView();
    await openMenu("Alice → Bob");
    await waitFor(async () => expect(await labels()).toContain("Clear service completed"));
    expect(await labels()).not.toContain("Mark service completed");
  });

  it("offers hold and cancel for an unpaid order", async () => {
    renderView();
    await openMenu("Cara → Dan");
    expect(await labels()).toEqual(["Place hold", "Cancel attempt"]);
  });

  it("offers 'mark refunded' and 'clear hold' when a refund is requested and the order is held", async () => {
    renderView();
    await openMenu("Gus → Hal");
    // the service action joins once the order's details have loaded
    await waitFor(async () =>
      expect(await labels()).toEqual(["Mark refunded", "Clear hold", "Mark service completed"]),
    );
  });

  it("offers nothing once the trainer has been paid out", async () => {
    renderView();
    const menu = await openMenu("Eve → Fay");
    expect(within(menu).queryAllByRole("menuitem")).toHaveLength(0);
  });
});

describe("AdminOrdersView — recording ledger actions", () => {
  async function choose(people: string, item: string) {
    await openMenu(people);
    fireEvent.click(await screen.findByRole("menuitem", { name: item }));
    return screen.findByRole("dialog");
  }

  it("asks for a reason first and won't record without one", async () => {
    renderView();
    const dialog = await choose("Alice → Bob", "Request refund");
    expect(within(dialog).getByText("Request refund?")).toBeInTheDocument();
    expect(within(dialog).getByText("Alice → Bob · NT$1,200")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Request refund" }));
    expect(await within(dialog).findByText("This action requires a reason note.")).toBeInTheDocument();
    expect(setPaymentStatus).not.toHaveBeenCalled();
  });

  it("records a refund request with the reason, then refreshes", async () => {
    renderView();
    const dialog = await choose("Alice → Bob", "Request refund");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " duplicate charge " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Request refund" }));
    await waitFor(() =>
      expect(setPaymentStatus).toHaveBeenCalledWith("o1", "refund_requested", "duplicate charge"),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastShow).toHaveBeenCalledWith("Order updated", "success");
  });

  it("places and clears a hold", async () => {
    renderView();
    let dialog = await choose("Alice → Bob", "Place hold");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "dispute" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Place hold" }));
    await waitFor(() => expect(setPaymentHold).toHaveBeenCalledWith("o1", true, "dispute"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    dialog = await choose("Gus → Hal", "Clear hold");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "resolved" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear hold" }));
    await waitFor(() => expect(setPaymentHold).toHaveBeenCalledWith("o4", false, "resolved"));
  });

  it("marks the service completed, and clears it", async () => {
    renderView();
    await openMenu("Alice → Bob");
    const item = await screen.findByRole("menuitem", { name: "Mark service completed" });
    fireEvent.click(item);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "session was held" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark service completed" }));
    await waitFor(() => expect(correctServiceCompleted).toHaveBeenCalledWith("o1", true, "session was held"));
  });

  it("cancels an unpaid attempt", async () => {
    renderView();
    const dialog = await choose("Cara → Dan", "Cancel attempt");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "user asked" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel attempt" }));
    await waitFor(() => expect(setPaymentStatus).toHaveBeenCalledWith("o2", "cancel", "user asked"));
  });

  it("keeps the dialog open and reports a failure", async () => {
    setPaymentHold.mockRejectedValueOnce(new Error("forbidden"));
    renderView();
    const dialog = await choose("Alice → Bob", "Place hold");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "x" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Place hold" }));
    await waitFor(() =>
      expect(toastShow).toHaveBeenCalledWith(expect.stringContaining("Couldn't update"), "destructive"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("is read-only: no ⋯ menu in the details sheet", async () => {
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByText("PG-1001");
    expect(within(sheet).queryByRole("button", { name: "Order actions" })).not.toBeInTheDocument();
  });

  it("shows a single status pill and the manual-transfer payment method in the sheet", async () => {
    fetchOrderDetail.mockResolvedValueOnce(detail({ refund_status: "refund_requested" }));
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByText("PG-1001");
    expect(within(sheet).getByText("Refund requested")).toBeInTheDocument();
    expect(within(sheet).queryByText("Paid")).not.toBeInTheDocument();
    expect(within(sheet).getByText("Payment method")).toBeInTheDocument();
    expect(within(sheet).getByText("Manual transfer")).toBeInTheDocument();
  });

  it("has no divider under the header, and the close button is lined up with the title", async () => {
    renderView();
    fireEvent.click(orderRow("Alice → Bob"));
    const sheet = await screen.findByRole("dialog");
    await within(sheet).findByText("PG-1001");
    const header = within(sheet).getByText("Alice → Bob").parentElement as HTMLElement;
    expect(header.className).not.toMatch(/border-b/);
    const close = within(sheet).getByRole("button", { name: /close/i });
    expect(close.className).toContain("top-[35px]");
    expect(close.className).toContain("right-6");
  });
});

describe("AdminOrdersView — localized", () => {
  it("has no untranslated keys in en or zh, including the sheet", async () => {
    for (const lng of ["en", "zh"] as const) {
      const { container, unmount } = renderView(lng);
      expect(container.textContent).not.toMatch(/\b(orders|verifications|pagination)\.[a-zA-Z_.]+/);
      fireEvent.click(orderRow("Alice → Bob"));
      await screen.findByRole("dialog");
      await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("PG-1001"));
      expect(screen.getByRole("dialog").textContent).not.toMatch(/\b(orders|verifications)\.[a-zA-Z_.]+/);
      unmount();
    }
  });

  it("renders the Chinese column headers", () => {
    renderView("zh");
    for (const h of ["訂單", "金額", "狀態", "付款方式", "建立時間", "操作"]) {
      expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    }
  });
});
