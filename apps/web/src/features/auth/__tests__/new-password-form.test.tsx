import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewPasswordForm, PasswordResetStatusCard } from "../new-password-form";

vi.mock("next/navigation", () => ({
  usePathname: () => "/new-password",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("NewPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("validates password confirmation before submitting", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<NewPasswordForm />);

    fireEvent.change(screen.getByLabelText("newPassword.password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByLabelText("newPassword.confirmPassword"), {
      target: { value: "secret2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "newPassword.submit" }));

    expect(
      screen.getByText("fieldErrors.field_password_mismatch"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates the password and shows the success state", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<NewPasswordForm />);

    fireEvent.change(screen.getByLabelText("newPassword.password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByLabelText("newPassword.confirmPassword"), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "newPassword.submit" }));

    await waitFor(() => {
      expect(screen.getByText("newPassword.successTitle")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/recovery/password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "secret1" }),
      }),
    );
  });

  it("maps server failures and hides raw provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: "password_update_invalid_password",
            provider: "Raw provider message",
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(<NewPasswordForm />);

    fireEvent.change(screen.getByLabelText("newPassword.password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByLabelText("newPassword.confirmPassword"), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "newPassword.submit" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "newPassword.inlineErrors.password_update_invalid_password",
        ),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Raw provider message/)).not.toBeInTheDocument();
  });
});

describe("PasswordResetStatusCard", () => {
  it("renders safe next actions for invalid recovery state", () => {
    render(<PasswordResetStatusCard error="password_update_link_expired" />);

    expect(
      screen.getByText("newPassword.errors.password_update_link_expired.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "newPassword.requestNewLink" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(
      screen.getByRole("link", { name: "newPassword.returnToSignIn" }),
    ).toHaveAttribute("href", "/sign-in");
  });
});
