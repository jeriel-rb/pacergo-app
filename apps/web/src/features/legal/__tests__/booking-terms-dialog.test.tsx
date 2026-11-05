import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/locales/en/legal.json";
import zh from "@/locales/zh/legal.json";
import { BOOKING_TERMS_ACTIVITIES, BOOKING_TERMS_VERSION } from "@/lib/booking-terms";
import { BookingTermsDialog } from "../booking-terms-dialog";

const acceptBookingTerms = vi.fn();
vi.mock("@/features/booking/booking-actions", () => ({
  acceptBookingTerms: (...a: unknown[]) => acceptBookingTerms(...a),
}));

function i18n(lng: "en" | "zh" = "en") {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["legal"],
    defaultNS: "legal",
    resources: { en: { legal: en }, zh: { legal: zh } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof BookingTermsDialog>> = {},
  lng: "en" | "zh" = "en",
) {
  const onAgreed = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n(lng)}>
      <BookingTermsDialog
        open
        onOpenChange={onOpenChange}
        bookingId="b1"
        role="companion"
        activitySlug="hiking"
        onAgreed={onAgreed}
        {...props}
      />
    </I18nextProvider>,
  );
  return { onAgreed, onOpenChange };
}

const terms = en.bookingTerms;

beforeEach(() => {
  acceptBookingTerms.mockReset().mockResolvedValue(undefined);
});

describe("Booking safety terms popup", () => {
  it("shows the trainer's terms with the booking's activity section", () => {
    renderDialog();
    expect(screen.getByText(terms.dialog.title.companion)).toBeInTheDocument();
    expect(screen.getByText(terms.companion.title)).toBeInTheDocument();
    expect(screen.getByText(terms.activities.hiking.title)).toBeInTheDocument();
    expect(screen.queryByText(terms.activities.gym.title)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(BOOKING_TERMS_VERSION))).toBeInTheDocument();
  });

  it("shows the member's terms when paying", () => {
    renderDialog({ role: "seeker", activitySlug: "gym" });
    expect(screen.getByText(terms.dialog.title.seeker)).toBeInTheDocument();
    expect(screen.getByText(terms.seeker.title)).toBeInTheDocument();
    expect(screen.getByText(terms.activities.gym.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: terms.dialog.confirm.seeker })).toBeInTheDocument();
  });

  it("shows only the general terms for an activity without its own section", () => {
    renderDialog({ activitySlug: "yoga" });
    expect(screen.getByText(terms.companion.title)).toBeInTheDocument();
    for (const slug of BOOKING_TERMS_ACTIVITIES) {
      expect(screen.queryByText(terms.activities[slug].title)).not.toBeInTheDocument();
    }
  });

  it("can't be agreed to until the box is ticked", () => {
    const { onAgreed } = renderDialog();
    const confirm = screen.getByRole("button", { name: terms.dialog.confirm.companion });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(acceptBookingTerms).not.toHaveBeenCalled();
    expect(onAgreed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(terms.dialog.agree));
    expect(confirm).toBeEnabled();
  });

  it("saves the agreement in the reader's language, then closes and continues", async () => {
    const { onAgreed, onOpenChange } = renderDialog({}, "zh");
    fireEvent.click(screen.getByLabelText(zh.bookingTerms.dialog.agree));
    fireEvent.click(screen.getByRole("button", { name: zh.bookingTerms.dialog.confirm.companion }));
    await waitFor(() => expect(onAgreed).toHaveBeenCalledTimes(1));
    expect(acceptBookingTerms).toHaveBeenCalledWith("b1", "zh");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open and does not continue when saving fails", async () => {
    acceptBookingTerms.mockRejectedValueOnce(new Error("network"));
    const { onAgreed } = renderDialog();
    fireEvent.click(screen.getByLabelText(terms.dialog.agree));
    fireEvent.click(screen.getByRole("button", { name: terms.dialog.confirm.companion }));
    expect(await screen.findByRole("alert")).toHaveTextContent(terms.dialog.saveFailed);
    expect(onAgreed).not.toHaveBeenCalled();
  });
});

describe("Booking safety terms copy", () => {
  it("has every activity section in both languages", () => {
    for (const slug of BOOKING_TERMS_ACTIVITIES) {
      for (const copy of [en.bookingTerms, zh.bookingTerms]) {
        expect(copy.activities[slug].title.length).toBeGreaterThan(0);
        expect(copy.activities[slug].body.length).toBeGreaterThan(0);
      }
    }
  });

  it("uses the same keys in Chinese and English", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    expect(keys(zh.bookingTerms).sort()).toEqual(keys(en.bookingTerms).sort());
  });
});
