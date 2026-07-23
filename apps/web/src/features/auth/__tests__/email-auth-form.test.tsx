import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailAuthForm } from "../email-auth-form";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const resend = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/sign-up",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (values?.email) return `${key}:${values.email}`;
      return key;
    },
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signUp,
      signInWithPassword,
      resend,
    },
  }),
}));

vi.mock("@/lib/supabase/env", () => ({
  APP_URL: "",
  SUPABASE_CONFIGURED: true,
  SUPABASE_KEY: "test-key",
  SUPABASE_URL: "https://project-ref.supabase.co",
}));

describe("EmailAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows field-level sign-up errors before calling Supabase", () => {
    render(<EmailAuthForm mode="sign-up" />);

    fireEvent.click(screen.getByRole("button", { name: "signUpCta" }));

    expect(
      screen.getByText("fieldErrors.field_email_required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("fieldErrors.field_password_required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("fieldErrors.field_confirm_password_required"),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("maps sign-in provider errors to localized UI keys", async () => {
    signInWithPassword.mockResolvedValueOnce({
      error: {
        code: "email_not_confirmed",
        message: "Raw provider message: Email not confirmed",
        status: 400,
      },
    });

    render(<EmailAuthForm mode="sign-in" />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "runner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "signInCta" }));

    await waitFor(() => {
      expect(screen.getByText("errors.auth_email_not_verified")).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/Raw provider message/i),
    ).not.toBeInTheDocument();
  });
});
