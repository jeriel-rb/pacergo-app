import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/sessions.json";
import { ReviewSection } from "../review-section";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const submitReview = vi.fn().mockResolvedValue(undefined);
vi.mock("../review-actions", () => ({
  submitReview: (...a: unknown[]) => submitReview(...a),
}));
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));

function renderSection(myReview: React.ComponentProps<typeof ReviewSection>["myReview"]) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    ns: ["sessions"],
    defaultNS: "sessions",
    resources: { en: { sessions: en } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={instance}>
      <ReviewSection bookingId="b1" myReview={myReview} />
    </I18nextProvider>,
  );
}

const saved = { id: "r1", rating: 4, comment: "Great", created_at: "2026-01-01" };

describe("ReviewSection submit button", () => {
  beforeEach(() => submitReview.mockClear());

  it("is disabled when editing an existing review without changing it", () => {
    renderSection(saved);
    fireEvent.click(screen.getByRole("button", { name: en.review.edit }));
    expect(screen.getByRole("button", { name: en.review.submit })).toBeDisabled();
  });

  it("enables after the rating or comment changes, and disables again when reverted", () => {
    renderSection(saved);
    fireEvent.click(screen.getByRole("button", { name: en.review.edit }));
    const submit = screen.getByRole("button", { name: en.review.submit });

    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(submit).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(en.review.comment), { target: { value: "Great!!" } });
    expect(submit).toBeEnabled();
  });

  it("submits the change", async () => {
    renderSection(saved);
    fireEvent.click(screen.getByRole("button", { name: en.review.edit }));
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: en.review.submit }));
    await waitFor(() => expect(submitReview).toHaveBeenCalledWith("b1", 5, "Great"));
  });

  it("lets a brand-new review be submitted straight away", () => {
    renderSection(null);
    fireEvent.click(screen.getByRole("button", { name: en.review.leave }));
    expect(screen.getByRole("button", { name: en.review.submit })).toBeEnabled();
  });
});
