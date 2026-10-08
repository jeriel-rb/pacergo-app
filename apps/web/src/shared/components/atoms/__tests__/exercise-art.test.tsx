import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseArt } from "../exercise-art";
import { ListOptionRow } from "../list-option-row";
import { exerciseArtFrameCount } from "@/shared/assets/exercise-art";

const masks = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>("span[style*='mask-image']")];

describe("ExerciseArt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the first frame when not animating", () => {
    const { container } = render(<ExerciseArt slug="bench-press" />);
    expect(masks(container).map((m) => m.style.maskImage)).toEqual([
      "url(/exercise-art/bench-press/frame-1.svg)",
    ]);
  });

  it("cycles frames when animate is on and the slug has more than one", () => {
    const count = exerciseArtFrameCount("bench-press");
    expect(count).toBeGreaterThan(1);
    const { container } = render(<ExerciseArt slug="bench-press" animate />);
    expect(masks(container)[0].style.maskImage).toContain("frame-1.svg");
    act(() => {
      vi.advanceTimersByTime(280);
    });
    expect(masks(container)[0].style.maskImage).toContain("frame-2.svg");
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
