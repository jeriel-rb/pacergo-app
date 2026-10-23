import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroBanner } from "../hero-banner";

describe("HeroBanner (slim)", () => {
  it("is one link to the trainers list carrying title, subtitle and CTA", () => {
    render(
      <HeroBanner
        href="/en/trainers"
        title="Find your training partner"
        subtitle="6 pro trainers waiting for you"
        cta="Browse trainers"
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/en/trainers");
    expect(screen.getByRole("heading", { name: "Find your training partner" })).toBeInTheDocument();
    expect(screen.getByText("6 pro trainers waiting for you")).toBeInTheDocument();
    // labelled pill on wider screens, screen-reader text behind the phone arrow
    expect(screen.getAllByText("Browse trainers")).toHaveLength(2);
  });
});
