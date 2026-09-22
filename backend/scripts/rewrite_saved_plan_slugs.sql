-- Saved plans: replace old exercise slugs with the current catalog slugs.
--
-- ALREADY APPLIED to the live project by the consolidated migration
-- 20260922020000_exercise_catalog_update.sql (its last block is the REWRITE below).
-- Kept for reference and for other databases; the PREVIEW and VERIFY selects are
-- still handy for checking a plan set.
--
-- Saved plans store each exercise's slug inside their JSON (user_training_plans.plan).
-- The exercise list moved from snake_case slugs (push_up, barbell_bench_press …) to the
-- 302-exercise catalog (push-up, bench-press …), so those stored slugs are STALE: an
-- exercise link from an old plan resolves through an app fallback, and this script makes
-- the data itself correct. It does not change the rest of a plan — use Update
-- Preferences on a plan to regenerate it under the current rules.
--
-- Safe to re-run: it only touches slugs that are still old. Run the PREVIEW first.
-- To run it by hand, paste it into the Supabase SQL editor (it edits user data).

-- ── 1. PREVIEW ─ which saved plans still hold old slugs ─────────────────────────────────
with slug_map(old_slug, new_slug) as (
  values
    ('push_up', 'push-up'),
    ('incline_push_up', 'incline-push-up'),
    ('decline_push_up', 'decline-push-up'),
    ('bodyweight_squat', 'bodyweight-squat'),
    ('walking_lunge', 'walking-lunge'),
    ('reverse_lunge', 'reverse-lunge'),
    ('jump_squat', 'jump-squat'),
    ('glute_bridge', 'glute-bridge'),
    ('single_leg_glute_bridge', 'single-leg-glute-bridge'),
    ('side_plank', 'side-plank'),
    ('mountain_climbers', 'mountain-climber'),
    ('bicycle_crunch', 'bicycle-crunch'),
    ('leg_raise', 'lying-leg-raise'),
    ('high_knees', 'high-knees'),
    ('jumping_jacks', 'jumping-jack'),
    ('tricep_dips_chair', 'chair-dip'),
    ('wall_sit', 'wall-sit'),
    ('standing_calf_raise_bodyweight', 'calf-raise'),
    ('barbell_back_squat', 'squat'),
    ('barbell_front_squat', 'front-squat'),
    ('barbell_deadlift', 'deadlift'),
    ('romanian_deadlift', 'romanian-deadlift'),
    ('barbell_bench_press', 'bench-press'),
    ('incline_barbell_bench_press', 'incline-bench-press'),
    ('barbell_overhead_press', 'overhead-press'),
    ('barbell_bent_over_row', 'barbell-row'),
    ('barbell_hip_thrust', 'hip-thrust'),
    ('barbell_lunge', 'walking-lunge'), -- closest match (no exact twin)
    ('dumbbell_bench_press', 'dumbbell-bench-press'),
    ('dumbbell_shoulder_press', 'seated-dumbbell-press'),
    ('dumbbell_row', 'one-arm-dumbbell-row'),
    ('dumbbell_romanian_deadlift', 'dumbbell-romanian-deadlift'),
    ('dumbbell_goblet_squat', 'goblet-squat'),
    ('dumbbell_lateral_raise', 'lateral-raise'),
    ('dumbbell_bicep_curl', 'bicep-curl'),
    ('dumbbell_hammer_curl', 'hammer-curl'),
    ('dumbbell_tricep_kickback', 'tricep-kickback'),
    ('dumbbell_step_up', 'step-up'),
    ('incline_dumbbell_press', 'incline-dumbbell-press'),
    ('close_grip_bench_press', 'close-grip-bench-press'),
    ('flat_bench_dumbbell_fly', 'dumbbell-fly'),
    ('pull_up', 'pull-up'),
    ('chin_up', 'chin-up'),
    ('kettlebell_swing', 'kettlebell-swing'),
    ('kettlebell_goblet_squat', 'goblet-squat'),
    ('adjustable_dumbbell_thruster', 'goblet-squat'), -- closest match (no exact twin)
    ('lat_pulldown', 'lat-pulldown'),
    ('seated_cable_row', 'seated-row'),
    ('leg_press', 'leg-press'),
    ('leg_extension', 'leg-extension'),
    ('leg_curl', 'leg-curl'),
    ('cable_tricep_pushdown', 'tricep-pushdown'),
    ('cable_bicep_curl', 'cable-curl'),
    ('cable_face_pull', 'face-pull'),
    ('chest_press_machine', 'machine-chest-press'),
    ('pec_deck_fly', 'pec-deck'),
    ('shoulder_press_machine', 'machine-shoulder-press'),
    ('seated_calf_raise_machine', 'seated-calf-raise'),
    ('standing_calf_raise_machine', 'standing-calf-raise'),
    ('hip_abduction_machine', 'hip-abduction-machine'),
    ('hip_adduction_machine', 'hip-adduction-machine'),
    ('smith_machine_squat', 'smith-machine-squat'),
    ('assisted_dip_machine', 'assisted-dip'),
    ('cable_woodchopper', 'cable-woodchop'),
    ('cable_lateral_raise', 'cable-lateral-raise'),
    ('rope_tricep_overhead_extension', 'overhead-tricep-extension'),
    ('resistance_band_row', 'banded-row'),
    ('resistance_band_squat', 'banded-squat'),
    ('resistance_band_lateral_walk', 'banded-lateral-walk'),
    ('band_pull_apart', 'band-pull-apart'),
    ('band_bicep_curl', 'bicep-curl'), -- closest match (no exact twin)
    ('treadmill_run', 'running'),
    ('stationary_bike', 'cycling'),
    ('air_bike_intervals', 'assault-bike'),
    ('elliptical_steady_state', 'elliptical'),
    ('jump_rope', 'jump-rope'),
    ('rowing_machine', 'rowing'),
    ('outdoor_cycling', 'cycling'),
    ('stair_climber', 'stair-climber'),
    ('ski_erg', 'skierg'),
    ('battle_ropes', 'battle-ropes')
)
select p.id,
       p.user_id,
       p.label,
       p.created_at,
       (select array_agg(m.old_slug order by m.old_slug)
          from slug_map m
         where position('"slug": "' || m.old_slug || '"' in p.plan::text) > 0) as old_slugs_found
  from user_training_plans p
 where exists (
         select 1 from slug_map m
          where position('"slug": "' || m.old_slug || '"' in p.plan::text) > 0
       )
 order by p.created_at;

-- ── 2. REWRITE ─ run this block once you're happy with the preview ─────────────────────
do $$
declare
  m record;
  changed int;
  total int := 0;
begin
  for m in
    select * from (
      values
        ('push_up', 'push-up'),
        ('incline_push_up', 'incline-push-up'),
        ('decline_push_up', 'decline-push-up'),
        ('bodyweight_squat', 'bodyweight-squat'),
        ('walking_lunge', 'walking-lunge'),
        ('reverse_lunge', 'reverse-lunge'),
        ('jump_squat', 'jump-squat'),
        ('glute_bridge', 'glute-bridge'),
        ('single_leg_glute_bridge', 'single-leg-glute-bridge'),
        ('side_plank', 'side-plank'),
        ('mountain_climbers', 'mountain-climber'),
        ('bicycle_crunch', 'bicycle-crunch'),
        ('leg_raise', 'lying-leg-raise'),
        ('high_knees', 'high-knees'),
        ('jumping_jacks', 'jumping-jack'),
        ('tricep_dips_chair', 'chair-dip'),
        ('wall_sit', 'wall-sit'),
        ('standing_calf_raise_bodyweight', 'calf-raise'),
        ('barbell_back_squat', 'squat'),
        ('barbell_front_squat', 'front-squat'),
        ('barbell_deadlift', 'deadlift'),
        ('romanian_deadlift', 'romanian-deadlift'),
        ('barbell_bench_press', 'bench-press'),
        ('incline_barbell_bench_press', 'incline-bench-press'),
        ('barbell_overhead_press', 'overhead-press'),
        ('barbell_bent_over_row', 'barbell-row'),
        ('barbell_hip_thrust', 'hip-thrust'),
        ('barbell_lunge', 'walking-lunge'), -- closest match (no exact twin)
        ('dumbbell_bench_press', 'dumbbell-bench-press'),
        ('dumbbell_shoulder_press', 'seated-dumbbell-press'),
        ('dumbbell_row', 'one-arm-dumbbell-row'),
        ('dumbbell_romanian_deadlift', 'dumbbell-romanian-deadlift'),
        ('dumbbell_goblet_squat', 'goblet-squat'),
        ('dumbbell_lateral_raise', 'lateral-raise'),
        ('dumbbell_bicep_curl', 'bicep-curl'),
        ('dumbbell_hammer_curl', 'hammer-curl'),
        ('dumbbell_tricep_kickback', 'tricep-kickback'),
        ('dumbbell_step_up', 'step-up'),
        ('incline_dumbbell_press', 'incline-dumbbell-press'),
        ('close_grip_bench_press', 'close-grip-bench-press'),
        ('flat_bench_dumbbell_fly', 'dumbbell-fly'),
        ('pull_up', 'pull-up'),
        ('chin_up', 'chin-up'),
        ('kettlebell_swing', 'kettlebell-swing'),
        ('kettlebell_goblet_squat', 'goblet-squat'),
        ('adjustable_dumbbell_thruster', 'goblet-squat'), -- closest match (no exact twin)
        ('lat_pulldown', 'lat-pulldown'),
        ('seated_cable_row', 'seated-row'),
        ('leg_press', 'leg-press'),
        ('leg_extension', 'leg-extension'),
        ('leg_curl', 'leg-curl'),
        ('cable_tricep_pushdown', 'tricep-pushdown'),
        ('cable_bicep_curl', 'cable-curl'),
        ('cable_face_pull', 'face-pull'),
        ('chest_press_machine', 'machine-chest-press'),
        ('pec_deck_fly', 'pec-deck'),
        ('shoulder_press_machine', 'machine-shoulder-press'),
        ('seated_calf_raise_machine', 'seated-calf-raise'),
        ('standing_calf_raise_machine', 'standing-calf-raise'),
        ('hip_abduction_machine', 'hip-abduction-machine'),
        ('hip_adduction_machine', 'hip-adduction-machine'),
        ('smith_machine_squat', 'smith-machine-squat'),
        ('assisted_dip_machine', 'assisted-dip'),
        ('cable_woodchopper', 'cable-woodchop'),
        ('cable_lateral_raise', 'cable-lateral-raise'),
        ('rope_tricep_overhead_extension', 'overhead-tricep-extension'),
        ('resistance_band_row', 'banded-row'),
        ('resistance_band_squat', 'banded-squat'),
        ('resistance_band_lateral_walk', 'banded-lateral-walk'),
        ('band_pull_apart', 'band-pull-apart'),
        ('band_bicep_curl', 'bicep-curl'), -- closest match (no exact twin)
        ('treadmill_run', 'running'),
        ('stationary_bike', 'cycling'),
        ('air_bike_intervals', 'assault-bike'),
        ('elliptical_steady_state', 'elliptical'),
        ('jump_rope', 'jump-rope'),
        ('rowing_machine', 'rowing'),
        ('outdoor_cycling', 'cycling'),
        ('stair_climber', 'stair-climber'),
        ('ski_erg', 'skierg'),
        ('battle_ropes', 'battle-ropes')
    ) as t(old_slug, new_slug)
  loop
    update user_training_plans
       set plan = replace(plan::text,
                          '"slug": "' || m.old_slug || '"',
                          '"slug": "' || m.new_slug || '"')::jsonb
     where position('"slug": "' || m.old_slug || '"' in plan::text) > 0;
    get diagnostics changed = row_count;
    total := total + changed;
  end loop;
  raise notice 'saved plans updated (summed over slugs): %', total;
end $$;

-- ── 3. VERIFY ─ should return 0 rows once the rewrite has run ──────────────────────────
select p.id, p.label
  from user_training_plans p
 where p.plan::text ~ '"slug": "[a-z]+_[a-z_]+"';
