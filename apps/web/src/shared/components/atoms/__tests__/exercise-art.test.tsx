import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExerciseArt } from "../exercise-art";
import { ListOptionRow } from "../list-option-row";

const masks = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>("span[style*='mask-image']")];

describe("ExerciseArt", () => {
  it("loops all three frames by default", () => {
    const { container } = render(<ExerciseArt slug="bench-press" />);
    expect(masks(container).map((m) => m.style.maskImage)).toEqual([
      "url(/exercise-art/bench-press/frame-1.svg)",
      "url(/exercise-art/bench-press/frame-2.svg)",
      "url(/exercise-art/bench-press/frame-3.svg)",
    ]);
  });

  it("shows only the first frame when `still`", () => {
    const { container } = render(<ExerciseArt slug="bench-press" still />);
    expect(masks(container).map((m) => m.style.maskImage)).toEqual([
      "url(/exercise-art/bench-press/frame-1.svg)",
    ]);
  });

  it("uses still first-frame thumbnails in list rows (equipment / cardio pickers)", () => {
    const { container } = render(
      <ListOptionRow art="deadlift" title="Barbell" selected={false} onSelect={() => {}} />,
    );
    expect(masks(container)).toHaveLength(1);
    expect(masks(container)[0].style.maskImage).toContain("deadlift/frame-1.svg");
  });
});
