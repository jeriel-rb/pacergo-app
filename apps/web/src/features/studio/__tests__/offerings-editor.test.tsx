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

type Status = "pending" | "approved" | "rejected";
type Map = Record<string, { status: Status; label: string | null }>;
const st = (status: Status) => ({ status, label: null });

function renderOfferings(
  verifications: Record<string, { status: Status }>,
  options?: { backgrounds?: Map; competitions?: Map; isCompanion?: boolean },
) {
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
        verifications={Object.fromEntries(
          Object.entries(verifications).map(([k, v]) => [k, st(v.status)]),
        )}
        competitions={options?.competitions ?? {}}
        backgrounds={options?.backgrounds ?? {}}
        isCompanion={options?.isCompanion}
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

describe("OfferingsEditor Tier C proof", () => {
  it("asks for a sports-background proof for Tier C when none is on file", () => {
    renderOfferings({});
    expect(screen.getByText("Gym sports-background proof required")).toBeInTheDocument();
    // Applicants still set the price; the proof goes with their first request.
    expect(screen.getByLabelText("Price (NT$)")).toBeInTheDocument();
  });

  it("does not ask for C proof when a certification already covers the activity", () => {
    renderOfferings({ gym: { status: "approved" } });
    expect(screen.queryByText("Gym sports-background proof required")).not.toBeInTheDocument();
  });

  it("holds an approved trainer's new Tier C plan until its proof is approved", () => {
    renderOfferings({}, { isCompanion: true, backgrounds: { gym: st("pending") } });
    expect(screen.getByText(/sports-background proof is under review/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Price (NT$)")).not.toBeInTheDocument();
    expect(screen.getByText(/once its Tier C proof is approved/)).toBeInTheDocument();
  });

  it("shows which tier each activity is verified for", () => {
    renderOfferings(
      { gym: { status: "approved" } },
      { backgrounds: { hyrox: st("pending") }, competitions: { gym: st("approved") } },
    );
    expect(screen.getByText("Tier review status by activity")).toBeInTheDocument();
    const gymRow = screen.getByRole("row", { name: /Gym/ });
    expect(gymRow).toHaveTextContent("VerifiedVerifiedVerified");
    const hyroxRow = screen.getByRole("row", { name: /Hyrox/ });
    expect(hyroxRow).toHaveTextContent("Not submittedNot submittedIn review");
  });
});
