import type { ActivitySlug, Tier } from "@pacergo/shared";
import type { VerificationMap, VerificationStatus } from "@/lib/studio";

/** Where one tier stands for one activity. */
export type TierState = "verified" | "pending" | "rejected" | "missing";

export interface ProofMaps {
  backgrounds: VerificationMap;
  verifications: VerificationMap;
  competitions: VerificationMap;
}

function fromStatus(status: VerificationStatus | undefined): TierState {
  if (status === "approved") return "verified";
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  return "missing";
}

/**
 * Each tier's state for one activity (tiers are per activity — A for gym and
 * C for Hyrox is normal).
 * - C: a sports-background proof, or a coach certification (which also covers C).
 * - B: a coach certification.
 * - A: a certification plus competition / award proof.
 */
export function tierStates(activity: ActivitySlug, maps: ProofMaps): Record<Tier, TierState> {
  const bg = maps.backgrounds[activity]?.status;
  const cert = maps.verifications[activity]?.status;
  const comp = maps.competitions[activity]?.status;

  const certState = fromStatus(cert);
  const c: TierState =
    bg === "approved" || cert === "approved"
      ? "verified"
      : bg === "pending" || cert === "pending"
        ? "pending"
        : bg === "rejected"
          ? "rejected"
          : "missing";
  const compState = fromStatus(comp);
  const a: TierState =
    certState === "verified" && compState === "verified"
      ? "verified"
      : compState === "rejected"
        ? "rejected"
        : certState === "pending" || compState === "pending"
          ? "pending"
          : "missing";
  return { C: c, B: certState, A: a };
}
