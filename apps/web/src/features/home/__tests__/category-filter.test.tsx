import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryFilter } from "../category-filter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "category.all": "全部",
        "category.gym": "健身",
        "category.walking": "健走",
        "category.running": "陪跑",
        "category.hiking": "陪爬",
        "category.hyrox": "Hyrox",
      })[key] ?? key,
  }),
}));

describe("CategoryFilter", () => {
  it("places 健走 immediately before 陪跑", () => {
    render(<CategoryFilter value="all" onChange={() => {}} />);
    const labels = screen.getAllByRole("button").map((button) => button.textContent);
    expect(labels).toEqual(["全部", "健身", "健走", "陪跑", "陪爬", "Hyrox"]);
  });
});
