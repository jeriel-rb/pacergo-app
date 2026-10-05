import { beforeEach, describe, expect, it } from "vitest";
import { captureAttribution, parseAttribution, readAttribution } from "../attribution";

describe("sign-up attribution", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("reads the website's utm tags", () => {
    expect(
      parseAttribution("?utm_source=website&utm_medium=taichung_validation&utm_campaign=mvp_launch"),
    ).toEqual({ utm_source: "website", utm_medium: "taichung_validation", utm_campaign: "mvp_launch" });
  });

  it("ignores other params and unsafe or oversized values", () => {
    expect(parseAttribution("?next=/x&utm_medium=<script>")).toEqual({});
    expect(parseAttribution(`?utm_source=${"a".repeat(65)}`)).toEqual({ utm_source: "a".repeat(64) });
  });

  it("remembers the tags if the user moves between sign-in and sign-up", () => {
    captureAttribution("?utm_medium=taichung_validation");
    expect(readAttribution("")).toEqual({ utm_medium: "taichung_validation" });
    captureAttribution("");
    expect(readAttribution("")).toEqual({ utm_medium: "taichung_validation" });
  });

  it("is empty when there is nothing to attribute", () => {
    expect(readAttribution("")).toEqual({});
  });
});
