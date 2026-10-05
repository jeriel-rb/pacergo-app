import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/admin.json";
import zh from "@/locales/zh/admin.json";
import type { AdminVerification } from "@/lib/admin";
import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
} from "@/shared/components/shell/admin-nav-items";
import { AdminVerificationsView } from "../admin-verifications-view";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => "/en/admin/verifications",
}));

const reviewVerification = vi.fn().mockResolvedValue(undefined);
const getCertSignedUrl = vi.fn().mockResolvedValue("https://example.test/doc.pdf");
vi.mock("../admin-actions", () => ({
  reviewVerification: (...a: unknown[]) => reviewVerification(...a),
  getCertSignedUrl: (...a: unknown[]) => getCertSignedUrl(...a),
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

const v = (over: Partial<AdminVerification>): AdminVerification => ({
  id: "v1",
  user_id: "u1",
  display_name: "Alice Chen",
  photo_url: null,
  doc_type: "certification",
  activity: "running",
  label: "NASM-CPT",
  document_path: "u1/doc.pdf",
  status: "pending",
  notes: null,
  created_at: "2026-10-01T00:00:00Z",
  reviewed_at: null,
  ...over,
});

const QUEUE: AdminVerification[] = [
  v({ id: "v1", display_name: "Alice Chen" }),
  v({ id: "v2", display_name: "Bob Lin", status: "approved", reviewed_at: "2026-10-02T00:00:00Z" }),
  v({ id: "v3", display_name: "Cara Wu", status: "rejected", reviewed_at: "2026-10-03T00:00:00Z" }),
  v({ id: "v4", display_name: "Dan Ho" }),
];

function renderView(lng: "en" | "zh" = "en", queue = QUEUE) {
  return render(
    <I18nextProvider i18n={i18n(lng)}>
      <AdminVerificationsView queue={queue} />
    </I18nextProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

/** Pick a status in the "Filter by status" dropdown. */
function chooseStatus(name: RegExp) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter by status" }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name }));
}

describe("AdminVerificationsView", () => {
  it("shows every request by default; the status is a plain dropdown, not tabs or counts", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Trainer requests" })).toBeInTheDocument();
    for (const n of ["Alice Chen", "Bob Lin", "Cara Wu", "Dan Ho"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    const select = screen.getByRole("combobox", { name: "Filter by status" });
    expect(select).toHaveTextContent("All");
    expect(select).not.toHaveTextContent("(");
    fireEvent.keyDown(select, { key: "Enter" });
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Pending", "Approved", "Rejected", "All"]);
  });

  it("filters to pending requests from the dropdown", () => {
    renderView();
    chooseStatus(/^Pending$/);
    expect(screen.getByText("Alice Chen")).toBeInTheDocument();
    expect(screen.getByText("Dan Ho")).toBeInTheDocument();
    expect(screen.queryByText("Bob Lin")).not.toBeInTheDocument();
  });

  it("keeps the dropdown's icon and label together, with only the chevron pushed right", () => {
    renderView();
    const select = screen.getByRole("combobox", { name: "Filter by status" });
    expect(select.className).toContain("sm:w-48"); // same width on every table
    expect(select.className).toContain("justify-start");
    expect(select.className).toContain("[&>svg:last-child]:ml-auto");
  });

  it("opens the PDF from a text link with an arrow, not an icon button", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderView();
    const row = screen.getByText("Alice Chen").closest("tr")!;
    const link = within(row).getByRole("link", { name: "View PDF" });
    expect(link.tagName).toBe("A");
    expect(link.querySelector("svg")).not.toBeNull(); // the right arrow
    fireEvent.click(link);
    await waitFor(() => expect(getCertSignedUrl).toHaveBeenCalledWith("u1/doc.pdf"));
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://example.test/doc.pdf", "_blank", "noopener,noreferrer"));
    // every request has one, whatever its status
    expect(within(screen.getByText("Bob Lin").closest("tr")!).getByRole("link", { name: "View PDF" })).toBeInTheDocument();
    open.mockRestore();
  });

  it("uses a short search placeholder", () => {
    renderView();
    expect(screen.getByPlaceholderText("Search by name…")).toBeInTheDocument();
  });

  it("shows which were approved and which were rejected", () => {
    renderView();
    chooseStatus(/^Approved$/);
    const approved = screen.getByText("Bob Lin").closest("tr")!;
    expect(within(approved).getByText("Approved")).toBeInTheDocument();
    expect(within(approved).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    chooseStatus(/^Rejected$/);
    expect(within(screen.getByText("Cara Wu").closest("tr")!).getByText("Rejected")).toBeInTheDocument();
    chooseStatus(/^All$/);
    for (const n of ["Alice Chen", "Bob Lin", "Cara Wu", "Dan Ho"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it("searches by trainer name", () => {
    renderView();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "cara" } });
    expect(screen.getByText("Cara Wu")).toBeInTheDocument();
    expect(screen.queryByText("Alice Chen")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nobody" } });
    expect(screen.getByText("No requests match your search.")).toBeInTheDocument();
  });

  it("keeps the search field compact, not stretched across the page", () => {
    renderView();
    const search = screen.getByRole("searchbox").parentElement as HTMLElement;
    expect(search.className).toContain("sm:w-80");
    expect(search.className).not.toContain("flex-1");
  });

  it("approves a pending request after confirming, then refreshes", async () => {
    renderView();
    const row = screen.getByText("Alice Chen").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "verified" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(reviewVerification).toHaveBeenCalledWith("v1", "approved", "verified"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("rejects with a note", async () => {
    renderView();
    const row = screen.getByText("Dan Ho").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "blurry" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(reviewVerification).toHaveBeenCalledWith("v4", "rejected", "blurry"));
  });

  it("shows an empty state, and is localized", () => {
    renderView("en", []);
    expect(screen.getByText("No requests in this view.")).toBeInTheDocument();
  });

  it.each(["en", "zh"] as const)("has no untranslated keys in %s", (lng) => {
    const { container } = renderView(lng);
    expect(container.textContent).not.toMatch(/\b(verifications|dashboard|docType)\.[a-zA-Z_.]+/);
  });
});

describe("admin sidebar", () => {
  it("has Trainer requests as its own item, right after Dashboard", () => {
    expect(ADMIN_NAV_ITEMS.map((i) => i.key)).toEqual([
      "dashboard",
      "verifications",
      "orders",
      "payouts",
      "exports",
    ]);
    expect(ADMIN_NAV_ITEMS.find((i) => i.key === "verifications")!.href).toBe("/admin/verifications");
  });

  it("highlights only the page you are on", () => {
    expect(isAdminNavItemActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavItemActive("/admin/verifications", "/admin")).toBe(false);
    expect(isAdminNavItemActive("/admin/verifications", "/admin/verifications")).toBe(true);
    expect(isAdminNavItemActive("/admin/orders/123", "/admin/orders")).toBe(true);
    expect(isAdminNavItemActive("/admin/orders", "/admin/verifications")).toBe(false);
  });

  it("has a label for it in both languages", () => {
    expect(en.nav.verifications).toBe("Trainer requests");
    expect(zh.nav.verifications).toBe("陪練申請");
  });
});
