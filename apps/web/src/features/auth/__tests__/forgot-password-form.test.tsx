import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "../forgot-password-form";

const resetPasswordForEmail = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/forgot-password",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      resetPasswordForEmail,
    },
  }),
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not submit missing or invalid email values", () => {
    render(<ForgotPasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "forgot.submit" }));
    expect(
      screen.getByText("fieldErrors.field_email_required"),
    ).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "forgot.submit" }));

    expect(
      screen.getByText("fieldErrors.field_email_invalid"),
    ).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("submits valid email and shows generic confirmation", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "Runner@Example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "forgot.submit" }));

    await waitFor(() => {
      expect(screen.getByText("forgot.successTitle")).toBeInTheDocument();
    });

    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "runner@example.com",
      expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/recovery?flow=recovery"),
      }),
    );
    expect(screen.getByText("forgot.successBody")).toBeInTheDocument();
  });

  it("maps rate limits and hides raw provider errors", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({
      error: {
        code: "over_email_send_rate_limit",
        message: "Raw provider message",
        status: 429,
      },
    });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "runner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "forgot.submit" }));

    await waitFor(() => {
      expect(
        screen.getByText("forgot.errors.password_reset_rate_limited"),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Raw provider message/)).not.toBeInTheDocument();
  });

  it("uses generic success for account-not-found provider responses", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({
      error: {
        code: "user_not_found",
        message: "User not found",
        status: 400,
      },
    });
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "forgot.submit" }));

    await waitFor(() => {
      expect(screen.getByText("forgot.successTitle")).toBeInTheDocument();
    });
  });
});
