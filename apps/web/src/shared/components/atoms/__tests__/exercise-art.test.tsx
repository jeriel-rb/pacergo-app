import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExerciseArt } from "../exercise-art";
import { ListOptionRow } from "../list-option-row";

const masks = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>("span[style*='mask-image']")];

describe("ExerciseArt", () => {
  it("shows one static illustration (the first frame)", () => {
    const { container } = render(<ExerciseArt slug="bench-press" />);
    expect(masks(container).map((m) => m.style.maskImage)).toEqual([
      "url(/exercise-art/bench-press/frame-1.svg)",
    ]);
  });

  it("is named for assistive tech only when given a label", () => {
    const { container, rerender } = render(<ExerciseArt slug="bench-press" label="Bench Press" />);
    expect(container.querySelector("[role='img']")?.getAttribute("aria-label")).toBe("Bench Press");
    rerender(<ExerciseArt slug="bench-press" />);
    expect(container.querySelector("[role='img']")).toBeNull();
  });

  it("uses the static first-frame thumbnail in list rows (equipment / cardio pickers)", () => {
    const { container } = render(
      <ListOptionRow art="deadlift" title="Barbell" selected={false} onSelect={() => {}} />,
    );
    expect(masks(container)).toHaveLength(1);
    expect(masks(container)[0].style.maskImage).toContain("deadlift/frame-1.svg");
  });
});
