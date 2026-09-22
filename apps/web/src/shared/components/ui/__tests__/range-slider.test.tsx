import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RangeSlider } from "../range-slider";

function setup(value: [number, number]) {
  const onChange = vi.fn();
  render(
    <RangeSlider
      min={10}
      max={300}
      step={5}
      value={value}
      onChange={onChange}
      formatValue={(v) => `${v}s`}
      minAriaLabel="Shortest rest"
      maxAriaLabel="Longest rest"
    />,
  );
  return {
    onChange,
    lo: screen.getByLabelText("Shortest rest"),
    hi: screen.getByLabelText("Longest rest"),
  };
}

describe("RangeSlider", () => {
  it("labels both thumbs with their formatted values", () => {
    setup([60, 180]);
    expect(screen.getByText("60s")).toBeInTheDocument();
    expect(screen.getByText("180s")).toBeInTheDocument();
  });

  it("moves each thumb independently", () => {
    const { onChange, lo, hi } = setup([60, 180]);
    fireEvent.change(lo, { target: { value: "30" } });
    expect(onChange).toHaveBeenLastCalledWith([30, 180]);
    fireEvent.change(hi, { target: { value: "240" } });
    expect(onChange).toHaveBeenLastCalledWith([60, 240]);
  });

  it("never lets the thumbs cross (keeps at least one step apart)", () => {
    const { onChange, lo, hi } = setup([60, 180]);
    fireEvent.change(lo, { target: { value: "250" } });
    expect(onChange).toHaveBeenLastCalledWith([175, 180]);
    fireEvent.change(hi, { target: { value: "20" } });
    expect(onChange).toHaveBeenLastCalledWith([60, 65]);
  });
});
