import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListFilter } from "lucide-react";
import { FilterSelect, TableSearch, TableToolbar } from "../table-toolbar";

function toolbar(onValueChange = vi.fn(), onChange = vi.fn()) {
  render(
    <TableToolbar>
      <TableSearch value="" onChange={onChange} placeholder="Search by name…" clearLabel="Clear" />
      <FilterSelect
        value="all"
        onValueChange={onValueChange}
        options={[
          { value: "all", label: "All" },
          { value: "paid", label: "Paid" },
        ]}
        label="Filter by status"
        icon={ListFilter}
      />
    </TableToolbar>,
  );
  return { onValueChange, onChange };
}

describe("TableToolbar", () => {
  it("lays the search and the filter side by side from sm, stacked on phones", () => {
    toolbar();
    const bar = screen.getByRole("searchbox").parentElement!.parentElement as HTMLElement;
    expect(bar.className).toContain("flex-col");
    expect(bar.className).toContain("sm:flex-row");
  });

  it("gives the search and the filter one fixed, compact width every table shares", () => {
    toolbar();
    expect(screen.getByRole("searchbox").parentElement!.className).toContain("sm:w-80");
    expect(screen.getByRole("searchbox").parentElement!.className).not.toContain("flex-1");
    expect(screen.getByRole("combobox", { name: "Filter by status" }).className).toContain("sm:w-48");
  });

  it("names the search box after its placeholder and reports typing", () => {
    const { onChange } = toolbar();
    const box = screen.getByRole("searchbox", { name: "Search by name…" });
    fireEvent.change(box, { target: { value: "techno" } });
    expect(onChange).toHaveBeenCalledWith("techno");
  });

  it("keeps the filter's icon and label together, with only the chevron pushed right", () => {
    toolbar();
    const select = screen.getByRole("combobox", { name: "Filter by status" });
    expect(select.className).toContain("justify-start");
    expect(select.className).toContain("[&>svg:last-child]:ml-auto");
  });

  it("shows the current choice and reports a new one", () => {
    const { onValueChange } = toolbar();
    const select = screen.getByRole("combobox", { name: "Filter by status" });
    expect(select).toHaveTextContent("All");
    fireEvent.keyDown(select, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Paid" }));
    expect(onValueChange).toHaveBeenCalledWith("paid");
  });
});
