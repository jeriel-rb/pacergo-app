import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { SaveButton } from "../save-button";
import { useFormDirty } from "@/shared/hooks/use-form-dirty";

describe("SaveButton", () => {
  it("is disabled while nothing has changed", () => {
    const onClick = vi.fn();
    render(<SaveButton dirty={false} label="Save" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("enables once dirty and fires onClick", () => {
    const onClick = vi.fn();
    render(<SaveButton dirty label="Save" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled while saving and swaps to the saving label", () => {
    render(<SaveButton dirty saving label="Save" savingLabel="Saving…" />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("stays disabled when the caller marks the form invalid", () => {
    render(<SaveButton dirty disabled label="Save" />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("defaults to type=button and accepts type=submit", () => {
    const { rerender } = render(<SaveButton dirty label="Save" />);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
    rerender(<SaveButton dirty type="submit" label="Save" />);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });
});

describe("useFormDirty", () => {
  function useDemo() {
    const [name, setName] = useState("Ann");
    const [bio, setBio] = useState("");
    return { name, setName, bio, setBio, ...useFormDirty({ name, bio }) };
  }

  it("starts clean, goes dirty on edit, and is clean again when edited back", () => {
    const { result } = renderHook(useDemo);
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setName("Bea"));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.setName("Ann"));
    expect(result.current.dirty).toBe(false);
  });

  it("markClean makes the saved values the new baseline", () => {
    const { result } = renderHook(useDemo);
    act(() => result.current.setBio("hello"));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.markClean());
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setBio(""));
    expect(result.current.dirty).toBe(true);
  });
});
