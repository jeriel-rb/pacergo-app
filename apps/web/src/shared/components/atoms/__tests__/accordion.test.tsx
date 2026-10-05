import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Accordion } from "../accordion";

const items = [
  { id: "a", title: "Account", children: <p>account body</p> },
  { id: "b", title: "Profile", hint: "3 fields", children: <p>profile body</p> },
  { id: "c", title: "Activity", children: <p>activity body</p> },
];

const trigger = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

describe("Accordion", () => {
  it("starts with every section open", () => {
    render(<Accordion items={items} />);
    for (const n of ["Account", "Profile", "Activity"]) {
      expect(trigger(n)).toHaveAttribute("aria-expanded", "true");
    }
    for (const body of ["account body", "profile body", "activity body"]) {
      expect(screen.getByText(body)).toBeVisible();
    }
  });

  it("closes and reopens a section without touching the others", () => {
    render(<Accordion items={items} />);
    fireEvent.click(trigger("Profile"));
    expect(trigger("Profile")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("profile body")).not.toBeVisible();
    expect(screen.getByText("account body")).toBeVisible();
    expect(screen.getByText("activity body")).toBeVisible();
    fireEvent.click(trigger("Profile"));
    expect(screen.getByText("profile body")).toBeVisible();
  });

  it("lets several sections be closed at once", () => {
    render(<Accordion items={items} />);
    fireEvent.click(trigger("Account"));
    fireEvent.click(trigger("Activity"));
    expect(screen.getByText("account body")).not.toBeVisible();
    expect(screen.getByText("activity body")).not.toBeVisible();
    expect(screen.getByText("profile body")).toBeVisible();
  });

  it("can start with only some sections open when asked", () => {
    render(<Accordion items={items} defaultOpen={["b"]} />);
    expect(trigger("Account")).toHaveAttribute("aria-expanded", "false");
    expect(trigger("Profile")).toHaveAttribute("aria-expanded", "true");
  });

  it("wires each header to its panel for assistive technology", () => {
    render(<Accordion items={items} />);
    const btn = trigger("Account");
    const panel = screen.getByRole("region", { name: "Account" });
    expect(btn.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(btn.id);
  });

  it("shows a hint next to the title", () => {
    render(<Accordion items={items} />);
    expect(screen.getByText("3 fields")).toBeInTheDocument();
  });
});
