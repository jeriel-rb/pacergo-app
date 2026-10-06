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
    const first = renderEditor(true, true, { isCompanion: false });
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeEnabled();
    first.unmount();
    renderEditor(true, true, { isCompanion: false, applicationStatus: "pending" });
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  });

  it("switches to Submit for review while a Tier B certificate is open", () => {
    renderEditor(true, true, { certificate: true });
    const submit = screen.getByRole("button", { name: "Submit for review" });
    expect(submit).toBeDisabled();
    expect(screen.getByText("Please choose a PDF to upload.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
