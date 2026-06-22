import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "../confirm-dialog";

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={vi.fn()}
      title="Delete account"
      description="This cannot be undone."
      confirmLabel="Delete forever"
      cancelLabel="Cancel"
      confirmKeyword="DELETE"
      confirmKeywordPlaceholder="Type DELETE"
      onConfirm={onConfirm}
      destructive
      {...overrides}
    />,
  );
  return { onConfirm };
}

describe("ConfirmDialog type-to-confirm", () => {
  it("keeps confirm disabled until the keyword matches", () => {
    renderDialog();
    const confirm = screen.getByRole("button", { name: "Delete forever" });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Type DELETE"), {
      target: { value: "DELETE" },
    });
    expect(confirm).toBeEnabled();
  });

  it("invokes onConfirm only after the keyword matches", () => {
    const { onConfirm } = renderDialog();
    fireEvent.change(screen.getByPlaceholderText("Type DELETE"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("enables confirm immediately when no keyword gate is set", () => {
    renderDialog({ confirmKeyword: undefined });
    expect(screen.getByRole("button", { name: "Delete forever" })).toBeEnabled();
  });
});
