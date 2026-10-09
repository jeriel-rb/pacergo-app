import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const adminRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ rpc: adminRpc }),
}));

import { POST } from "../route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/payments/simulated/confirm", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/payments/simulated/confirm", () => {
  beforeEach(() => {
    getUser.mockReset();
    adminRpc.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    adminRpc.mockResolvedValue({ error: null });
    process.env.PAYMENT_PROVIDER = "simulated";
  });
  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
  });

  it("refuses unless the deployment is set to the simulated provider", async () => {
    delete process.env.PAYMENT_PROVIDER; // production default: NewebPay only
    const res = await post({ paymentId: "p1", approve: true });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "payment_simulated_disabled" });
    expect(adminRpc).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("refuses a real NewebPay deployment even if the value is something else", async () => {
    process.env.PAYMENT_PROVIDER = "newebpay";
    expect((await post({ paymentId: "p1", approve: true })).status).toBe(403);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("rejects a caller who is not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await post({ paymentId: "p1", approve: true });
    expect(res.status).toBe(401);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed body", async () => {
    expect((await post({ paymentId: "p1" })).status).toBe(400);
    expect((await post({ approve: true })).status).toBe(400);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("confirms as the VERIFIED user, never an id taken from the request", async () => {
    const res = await post({ paymentId: "p1", approve: true, userId: "someone-else", p_user_id: "someone-else" });
    expect(res.status).toBe(200);
    expect(adminRpc).toHaveBeenCalledWith("confirm_simulated_payment", {
      p_payment_id: "p1",
      p_approve: true,
      p_user_id: "user-1",
    });
  });

  it("passes a decline through", async () => {
    await post({ paymentId: "p1", approve: false });
    expect(adminRpc).toHaveBeenCalledWith("confirm_simulated_payment", {
      p_payment_id: "p1",
      p_approve: false,
      p_user_id: "user-1",
    });
  });

  it("maps database refusals to a safe code", async () => {
    adminRpc.mockResolvedValue({ error: { message: "ERROR: payment_booking_not_owned" } });
    let res = await post({ paymentId: "p1", approve: true });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "payment_booking_not_owned" });

    adminRpc.mockResolvedValue({ error: { message: "ERROR: payment_not_simulated" } });
    res = await post({ paymentId: "p1", approve: true });
    expect(await res.json()).toEqual({ error: "payment_not_simulated" });

    adminRpc.mockResolvedValue({ error: { message: "connection string postgres://secret@host" } });
    res = await post({ paymentId: "p1", approve: true });
    expect(await res.json()).toEqual({ error: "payment_request_failed" }); // never leaks internals
  });
});
