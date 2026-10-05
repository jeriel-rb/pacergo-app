import type {
  ActivitySlug,
  TrainerSummary,
  TrainerProfile,
} from "@pacergo/shared";
import { USE_MOCK, getSupabase } from "../supabase-client";
import { MOCK_TRAINERS, RECOMMENDED_IDS } from "../mock/trainers";

const toSummary = (t: TrainerProfile): TrainerSummary => ({
  id: t.id,
  display_name: t.display_name,
  photo_url: t.photo_url,
  banner_url: t.banner_url,
  tier: t.tier,
  activities: t.activities,
  home_area: t.home_area,
  price_ntd: t.price_ntd,
  is_free: t.is_free,
  rating_avg: t.rating_avg,
  rating_count: t.rating_count,
  experience_level: t.experience_level,
});

/** Trainers for the home "推薦陪練" feed, optionally filtered by activity. */
export async function getRecommendedTrainers(opts?: {
  activity?: ActivitySlug;
}): Promise<TrainerSummary[]> {
  if (USE_MOCK) {
    const feed = RECOMMENDED_IDS.map(
      (id) => MOCK_TRAINERS.find((t) => t.id === id)!,
    ).map(toSummary);
    return opts?.activity
      ? feed.filter((t) => t.activities.includes(opts.activity!))
      : feed;
  }

  const { data, error } = await getSupabase().rpc("recommended_companions", {
    p_activity: opts?.activity ?? null,
  });
  if (error) {
    console.warn(safeTrainerQueryLog("recommended_companions", error));
    return fallbackRecommendedTrainers(opts?.activity);
  }
  return (data ?? []) as TrainerSummary[];
}

/** Full trainer profile by id, or null if not found. */
export async function getTrainerById(
  id: string,
): Promise<TrainerProfile | null> {
  if (USE_MOCK) {
    return MOCK_TRAINERS.find((t) => t.id === id) ?? null;
  }

  const { data, error } = await getSupabase().rpc("companion_profile", {
    p_id: id,
  });
  if (error) {
    console.warn(safeTrainerQueryLog("companion_profile", error));
    return MOCK_TRAINERS.find((t) => t.id === id) ?? null;
  }
  return (data ?? null) as TrainerProfile | null;
}

function fallbackRecommendedTrainers(activity?: ActivitySlug): TrainerSummary[] {
  const feed = RECOMMENDED_IDS.map(
    (id) => MOCK_TRAINERS.find((t) => t.id === id)!,
  ).map(toSummary);
  return activity ? feed.filter((t) => t.activities.includes(activity)) : feed;
}

function safeTrainerQueryLog(
  rpc: "recommended_companions" | "companion_profile",
  error: { code?: string; hint?: string | null },
) {
  return {
    event: "trainer_query_failed",
    rpc,
    provider_error_code: error.code ?? null,
    has_hint: Boolean(error.hint),
  };
}
