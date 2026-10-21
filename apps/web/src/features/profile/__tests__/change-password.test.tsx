import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUser = vi.fn();
const reauthenticate = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { updateUser, reauthenticate } }),
}));
vi.mock("@/features/ai-plan/onboarding-store", () => ({ clearOnboardingStorage: () => {} }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const toastShow = vi.fn();
vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ show: toastShow }) }));

import { changePassword } from "../profile-actions";
import { ChangePasswordDialog } from "../change-password-dialog";

const authError = (code: string) => ({ error: { code, message: code } });

describe("changePassword", () => {
  beforeEach(() => {
    updateUser.mockReset();
  });

  it("updates directly when Supabase accepts the session", async () => {
    updateUser.mockResolvedValue({ error: null });
    await expect(changePassword("new-secret")).resolves.toBe("updated");
    expect(updateUser).toHaveBeenCalledWith({ password: "new-secret" });
  });

  it("asks for the emailed code when Supabase requires reauthentication", async () => {
    updateUser.mockResolvedValue(authError("reauthentication_needed"));
    await expect(changePassword("new-secret")).resolves.toBe("code_required");
    updateUser.mockResolvedValue(authError("reauthentication_not_valid"));
    await expect(changePassword("new-secret")).resolves.toBe("code_required");
  });

  it("sends the code as the nonce and reports a wrong one", async () => {
    updateUser.mockResolvedValue(authError("reauthentication_not_valid"));
    await expect(changePassword("new-secret", "12345678")).resolves.toBe("code_invalid");
    expect(updateUser).toHaveBeenCalledWith({ password: "new-secret", nonce: "12345678" });
  });

  it("throws any other error", async () => {
    updateUser.mockResolvedValue({ error: { code: "weak_password", message: "Password is too weak" } });
    await expect(changePassword("x")).rejects.toThrow("Password is too weak");
  });
});

describe("ChangePasswordDialog", () => {
  beforeEach(() => {
    updateUser.mockReset();
    reauthenticate.mockReset();
    toastShow.mockReset();
    reauthenticate.mockResolvedValue({ error: null });
  });

  function fillPasswords(value: string) {
    fireEvent.change(screen.getByLabelText("changePasswordDialog.newPassword"), { target: { value } });
    fireEvent.change(screen.getByLabelText("changePasswordDialog.confirmPassword"), { target: { value } });
  }

  it("emails a code when the session is too old, then finishes with it", async () => {
    const onOpenChange = vi.fn();
    updateUser
      .mockResolvedValueOnce(authError("reauthentication_needed"))
      .mockResolvedValueOnce({ error: null });
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} />);

    fillPasswords("new-secret");
    fireEvent.click(screen.getByRole("button", { name: "changePasswordDialog.submit" }));

    const codeInput = await screen.findByLabelText("changePasswordDialog.code");
    expect(reauthenticate).toHaveBeenCalledTimes(1);

    fireEvent.change(codeInput, { target: { value: " 12345678 " } });
    fireEvent.click(screen.getByRole("button", { name: "changePasswordDialog.submit" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(updateUser).toHaveBeenLastCalledWith({ password: "new-secret", nonce: "12345678" });
    expect(toastShow).toHaveBeenCalledWith("changePasswordDialog.done", "success");
  });

  it("keeps the dialog open on a wrong code", async () => {
    const onOpenChange = vi.fn();
    updateUser
      .mockResolvedValueOnce(authError("reauthentication_needed"))
      .mockResolvedValueOnce(authError("reauthentication_not_valid"));
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} />);

    fillPasswords("new-secret");
    fireEvent.click(screen.getByRole("button", { name: "changePasswordDialog.submit" }));
    fireEvent.change(await screen.findByLabelText("changePasswordDialog.code"), {
      target: { value: "00000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "changePasswordDialog.submit" }));

    expect(await screen.findByText("changePasswordDialog.codeInvalid")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
