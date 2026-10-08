import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/studio.json";
import type { StudioListing } from "@/lib/studio";
import { ListingEditor, ListingSaveBar } from "../listing-editor";
import { VerificationGate } from "../certification-gate";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/en/studio",
}));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({}) }));

const listing: StudioListing = {
  id: "l1",
  headline: "Strength buddy",
  bio_long: "Let's train",
  served_area: "Xinyi",
  status: "draft",
  rating_avg: 0,
  rating_count: 0,
};

function renderEditor(
  hasPricing: boolean,
  hasAvailability: boolean,
  options?: {
    certificate?: boolean;
    isCompanion?: boolean;
    applicationStatus?: "pending" | "approved" | "rejected" | null;
    eligible?: boolean;
  },
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
  return render(
    <I18nextProvider i18n={instance}>
      <ListingEditor
        listing={listing}
        hasPricing={hasPricing}
        hasAvailability={hasAvailability}
        isCompanion={options?.isCompanion}
        applicationStatus={options?.applicationStatus}
        eligibility={{
          birthdate: null,
          attested: Boolean(options?.eligible),
          eligible: Boolean(options?.eligible),
        }}
      >
        {options?.certificate && (
          <VerificationGate
            docType="certification"
            activity="gym"
            activityLabel="Gym"
            status={undefined}
            tier="B"
          />
        )}
        <ListingSaveBar />
      </ListingEditor>
    </I18nextProvider>,
  );
}

describe("ListingEditor bottom button", () => {
  it("stays Save for Tier C, and stays off until a plan and availability exist", () => {
    renderEditor(false, false);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    expect(
      screen.queryByText(/Add a price plan and at least one availability slot/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
  });

  it("stays off when nothing changed, and turns on after a listing edit", () => {
    renderEditor(true, true);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    expect(save.className).toContain("w-full");
    expect(save.className).toContain("sm:w-auto");
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "New headline" } });
    expect(save).toBeEnabled();
  });

  it("lets an approved trainer save edits instead of submitting another review", () => {
    renderEditor(true, true, { isCompanion: true, applicationStatus: "approved" });
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Updated headline" } });
    expect(save).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
  });

  it("asks a new Tier C member to submit for review, and stays off while that request is pending", () => {
    const first = renderEditor(true, true, { isCompanion: false, eligible: true });
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeEnabled();
    first.unmount();
    renderEditor(true, true, { isCompanion: false, applicationStatus: "pending" });
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  });

  it("asks a first-time applicant for 18+ birthdate and the truthfulness confirmation", () => {
    renderEditor(true, true, { isCompanion: false });
    const submit = screen.getByRole("button", { name: "Submit for review" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1990-01-01" } });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I confirm that I am 18 or older/ }));
    expect(submit).toBeEnabled();
  });

  it("does not ask an already-confirmed applicant again", () => {
    renderEditor(true, true, { isCompanion: false, eligible: true });
    expect(screen.queryByLabelText("Date of birth")).not.toBeInTheDocument();
  });

  it("keeps Save until a certificate upload is started", () => {
    renderEditor(true, true, { certificate: true, isCompanion: true, eligible: true });
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
  });

  it("switches to Submit for review once a Tier B certificate is being filled in", () => {
    renderEditor(true, true, { certificate: true });
    fireEvent.change(screen.getByLabelText(/Certification name/), { target: { value: "NASM-CPT" } });
    const submit = screen.getByRole("button", { name: "Submit for review" });
    expect(submit).toBeDisabled();
    expect(screen.getByText("Please choose a PDF to upload.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
