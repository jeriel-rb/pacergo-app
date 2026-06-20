import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierBadge } from "../tier-badge";
import { PriceTag } from "../price-tag";
import { RatingStars } from "../rating-stars";

describe("TierBadge", () => {
  it("renders the zh label for tier A", () => {
    render(<TierBadge tier="A" locale="zh" />);
    expect(screen.getByText("社群頂流")).toBeInTheDocument();
  });

  it("renders the en label for tier C", () => {
    render(<TierBadge tier="C" locale="en" />);
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });

  it("prepends the grade letter when showGrade is set", () => {
    render(<TierBadge tier="B" locale="zh" showGrade />);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("資深專業")).toBeInTheDocument();
  });
});

describe("PriceTag", () => {
  it("formats a NT$ amount", () => {
    render(<PriceTag amount={650} />);
    expect(screen.getByText(/NT\$650/)).toBeInTheDocument();
  });

  it("shows the free label when isFree", () => {
    render(<PriceTag amount={0} isFree locale="zh" />);
    expect(screen.getByText("免費")).toBeInTheDocument();
  });

  it("appends the per-hour unit", () => {
    render(<PriceTag amount={1500} perHour locale="zh" />);
    expect(screen.getByText("/小時")).toBeInTheDocument();
  });
});

describe("RatingStars", () => {
  it("renders the value and review count", () => {
    render(<RatingStars value={4.8} count={127} />);
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("(127)")).toBeInTheDocument();
  });
});
