import { describe, it, expect } from "vitest";
import {
  CSV_UTF8_BOM,
  escapeCsvField,
  toCsv,
  toExcelCsv,
  type CsvCell,
  type CsvExport,
} from "../csv";

const SAMPLE: CsvExport<{ a: CsvCell; b: CsvCell; c: CsvCell }> = {
  resource: "sample",
  filename: () => "sample",
  columns: [
    { header: "A", cell: (r) => r.a },
    { header: "B", cell: (r) => r.b },
    { header: "C", cell: (r) => r.c },
  ],
};

describe("escapeCsvField", () => {
  it("leaves plain text untouched", () => {
    expect(escapeCsvField("hello")).toBe("hello");
    expect(escapeCsvField("9999")).toBe("9999");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("Taiwan, Taipei")).toBe('"Taiwan, Taipei"');
  });

  it("quotes and doubles up internal double-quotes", () => {
    expect(escapeCsvField('say "hi" now')).toBe('"say ""hi"" now"');
  });

  it("quotes fields containing newlines (CRLF and LF)", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("stringifies numbers and booleans", () => {
    expect(escapeCsvField(0)).toBe("0");
    expect(escapeCsvField(3.5)).toBe("3.5");
    expect(escapeCsvField(true)).toBe("true");
  });
});

describe("toCsv", () => {
  it("emits a header line terminated by a newline even with no rows", () => {
    const csv = toCsv(SAMPLE, []);
    expect(csv).toBe("A,B,C\n");
  });

  it("writes header + rows joined by newlines, trailing newline", () => {
    const csv = toCsv(SAMPLE, [
      { a: "1", b: 2, c: true },
      { a: "x, y", b: null, c: "z" },
    ]);
    expect(csv).toBe('A,B,C\n1,2,true\n"x, y",,z\n');
  });

  it("respects column order from the definition, not the row", () => {
    const def: CsvExport<{ z: CsvCell; a: CsvCell }> = {
      resource: "order",
      filename: () => "order",
      columns: [
        { header: "A", cell: (r) => r.a },
        { header: "Z", cell: (r) => r.z },
      ],
    };
    const csv = toCsv(def, [{ z: "2", a: "1" }]);
    expect(csv).toBe("A,Z\n1,2\n");
  });

  it("never leaks a full sensitive value that the mapper already masked", () => {
    const def: CsvExport<{ acct: CsvCell }> = {
      resource: "x",
      filename: () => "x",
      columns: [{ header: "Account (masked)", cell: (r) => String(r.acct) }],
    };
    const csv = toCsv(def, [{ acct: "********1234" }]);
    expect(csv).toContain("1234");
    expect(csv).not.toContain("4111111111111111"); // raw 16-digit PAN never appears
  });
});

describe("toExcelCsv", () => {
  it("prefixes UTF-8 BOM so Excel opens the file as UTF-8 CSV", () => {
    const excel = toExcelCsv(SAMPLE, [{ a: "1", b: "台北", c: true }]);
    expect(excel.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(excel.slice(CSV_UTF8_BOM.length)).toBe("A,B,C\n1,台北,true\n");
  });
});
