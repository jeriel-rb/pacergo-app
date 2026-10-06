import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/studio.json";
import { VerificationGate } from "../certification-gate";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const submitVerificationDoc = vi.fn().mockResolvedValue(undefined);
vi.mock("../studio-actions", () => ({
  submitVerificationDoc: (...a: unknown[]) => submitVerificationDoc(...a),
}));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));

function renderGate(docType: "certification" | "competition" = "certification") {
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
      <VerificationGate docType={docType} activity="gym" activityLabel="Gym" status={undefined} />
    </I18nextProvider>,
  );
}

function pickPdf(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["%PDF"], "cert.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => vi.clearAllMocks());

describe("VerificationGate — name is required", () => {
  it("marks the certification name with an asterisk and marks the input required", () => {
    renderGate();
    const input = screen.getByLabelText(/Certification name/);
    expect(input).toBeRequired();
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("cannot be submitted with a file but no name", () => {
    const { container } = renderGate();
    pickPdf(container);
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Certification name/), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeDisabled();
    expect(submitVerificationDoc).not.toHaveBeenCalled();
  });

  it("submits the trimmed name once it is filled in", async () => {
    const { container } = renderGate();
    pickPdf(container);
    fireEvent.change(screen.getByLabelText(/Certification name/), { target: { value: " NASM-CPT " } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() =>
      expect(submitVerificationDoc).toHaveBeenCalledWith(
        expect.objectContaining({ label: "NASM-CPT", docType: "certification" }),
      ),
    );
  });
});
