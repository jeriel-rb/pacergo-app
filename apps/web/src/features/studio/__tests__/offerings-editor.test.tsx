import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/studio.json";
import { OfferingsEditor } from "../offerings-editor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/en/studio",
}));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock("../studio-actions", () => ({
  addOffering: vi.fn(),
  removeOffering: vi.fn(),
}));

function renderOfferings(verifications: Record<string, { status: "pending" | "approved" | "rejected" }>) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["studio"],
    defaultNS: "studio",
    resources: { en: { studio: en } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={instance}>
      <OfferingsEditor
        offerings={[]}
        hasListing
        verifications={verifications}
        competitions={{}}
      />
    </I18nextProvider>,
  );
}

function chooseTier(tier: string) {
  fireEvent.click(screen.getByRole("button", { name: tier, pressed: false }));
}

describe("OfferingsEditor certificate steps", () => {
  it("asks for the Tier A document only once a Tier B certificate is already uploaded", () => {
    renderOfferings({ gym: { status: "pending" } });
    chooseTier("A");
    expect(screen.getByText("Gym competition experience required")).toBeInTheDocument();
    expect(screen.queryByText("Gym certification required")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose PDF" })).toBeInTheDocument();
  });

  it("does not ask for another Tier B certificate once that activity is already approved", () => {
    renderOfferings({ gym: { status: "approved" } });
    chooseTier("B");
    expect(screen.queryByRole("button", { name: "Choose PDF" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Price (NT$)")).toBeInTheDocument();
  });

  it("does not ask for a second Tier B certificate while the first is in review", () => {
    renderOfferings({ gym: { status: "pending" } });
    chooseTier("B");
    expect(screen.getByText(/certification is under review/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose PDF" })).not.toBeInTheDocument();
  });
});
