import { describe, it, expect, afterEach } from "vitest";
import { forbidCrossSiteOrigin } from "@/lib/request-origin";

function req(headers: Record<string, string>) {
  return new Request("https://app.pacergo.app/api/x", { method: "POST", headers });
}

describe("forbidCrossSiteOrigin", () => {
  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  const prevVercel = process.env.VERCEL_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = prevApp;
    process.env.VERCEL_URL = prevVercel;
  });

  it("allows same trusted app origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.pacergo.app";
    expect(
      forbidCrossSiteOrigin(
        req({ origin: "https://app.pacergo.app", host: "app.pacergo.app" }),
      ),
    ).toBeNull();
  });

  it("allows matching Host when Origin is present", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(
      forbidCrossSiteOrigin(
        req({ origin: "https://preview.example", host: "preview.example" }),
      ),
    ).toBeNull();
  });

  it("blocks cross-site Origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.pacergo.app";
    const res = forbidCrossSiteOrigin(
      req({ origin: "https://evil.example", host: "app.pacergo.app" }),
    );
    expect(res?.status).toBe(403);
    expect(await res!.json()).toEqual({ error: "forbidden_origin" });
  });

  it("blocks missing Origin when Sec-Fetch-Site is cross-site", async () => {
    const res = forbidCrossSiteOrigin(
      req({ "sec-fetch-site": "cross-site", host: "app.pacergo.app" }),
    );
    expect(res?.status).toBe(403);
  });

  it("allows missing Origin for same-origin navigations", () => {
    expect(
      forbidCrossSiteOrigin(req({ "sec-fetch-site": "same-origin", host: "app.pacergo.app" })),
    ).toBeNull();
  });
});
