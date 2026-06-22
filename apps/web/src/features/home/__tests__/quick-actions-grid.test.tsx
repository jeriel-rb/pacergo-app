import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Users, Utensils } from "lucide-react";
import { QuickActionsGrid, type QuickAction } from "../quick-actions-grid";

const items: QuickAction[] = [
  { icon: Users, label: "Find partner", tint: "", href: "/trainers" },
  { icon: Utensils, label: "Diet log", tint: "", soon: true },
];

describe("QuickActionsGrid", () => {
  it("renders a live action as a link to its destination", () => {
    render(<QuickActionsGrid items={items} />);
    const link = screen.getByRole("link", { name: /Find partner/i });
    expect(link).toHaveAttribute("href", "/trainers");
  });

  it("renders an unbuilt action as a disabled button", () => {
    render(<QuickActionsGrid items={items} />);
    const button = screen.getByRole("button", { name: /Diet log/i });
    expect(button).toBeDisabled();
  });

  it("does not turn an unbuilt action into a link", () => {
    render(<QuickActionsGrid items={items} />);
    expect(
      screen.queryByRole("link", { name: /Diet log/i }),
    ).not.toBeInTheDocument();
  });
});
