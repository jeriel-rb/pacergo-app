import { afterEach, describe, it, expect } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import hotToast from "react-hot-toast";
import { ToastProvider, useToast } from "../toast";

// react-hot-toast keeps toasts in a module-level store, so clear it between tests.
afterEach(() => {
  act(() => hotToast.remove());
});

function Trigger({ message, variant }: { message: string; variant?: "success" | "destructive" }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show(message, variant)}>
      fire
    </button>
  );
}

function fire() {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "fire" }));
  });
}

describe("shared toast (react-hot-toast)", () => {
  it("shows the already-localized message verbatim", async () => {
    render(
      <ToastProvider>
        <Trigger message="已儲存收款帳戶" variant="success" />
      </ToastProvider>,
    );
    fire();
    expect(await screen.findByText("已儲存收款帳戶")).toBeInTheDocument();
  });

  it("has no dismiss button", async () => {
    render(
      <ToastProvider>
        <Trigger message="Couldn't save" variant="destructive" />
      </ToastProvider>,
    );
    fire();
    await screen.findByText("Couldn't save");
    expect(screen.queryByRole("button", { name: /dismiss|close/i })).not.toBeInTheDocument();
    // Only our trigger button exists.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("is anchored top-center and takes its colors from the theme tokens", async () => {
    render(
      <ToastProvider>
        <Trigger message="Plan updated" variant="success" />
      </ToastProvider>,
    );
    fire();
    const message = await screen.findByText("Plan updated");
    const bar = message.closest("div[style*='var(--card)']") as HTMLElement | null;
    expect(bar).not.toBeNull();
    expect(bar!.style.background).toContain("var(--card)");
    expect(bar!.style.color).toContain("var(--card-foreground)");

    const wrapper = bar!.parentElement as HTMLElement;
    expect(wrapper.style.top).not.toBe("");
    expect(wrapper.style.bottom).toBe("");
  });
});
