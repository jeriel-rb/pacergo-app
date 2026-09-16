-- Pricing rework after market feedback: per-tier FLOORS only, no ceilings.
--   * Tier C at 600–800 read as "half a trainer's rate, without the cert" —
--     the C floor drops to NT$400 so companionship pricing is honest.
--   * Ceilings are removed across all tiers so high-demand companions can
--     price at a premium; floors still stop intra-tier undercutting.
--       C: 400+   B: 800+   A: 1200+
--   Kept in sync with @pacergo/shared TIER_PRICE_FLOORS.
-- Cert gates are unchanged (B/A need an approved certification for the
-- activity; A additionally needs approved competition experience — see 0027).

create or replace function add_offering(
  p_activity_slug text,
  p_tier tier_level,
  p_price_ntd int,
  p_is_free boolean,
  p_session_minutes int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing uuid;
  v_activity uuid;
  v_id uuid;
  v_min int;
  v_price int := coalesce(p_price_ntd, 0);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_listing from companion_listings where user_id = v_uid;
  if not found then raise exception 'create your listing first'; end if;
  select id into v_activity from activities where slug = p_activity_slug;
  if not found then raise exception 'unknown activity'; end if;

  -- 1. Price floor per tier (inclusive, no ceiling). Keep in sync with
  --    TIER_PRICE_FLOORS.
  v_min := case p_tier when 'C' then 400 when 'B' then 800 when 'A' then 1200 end;
  if v_price < v_min then
    raise exception 'price % is below the NT$% floor for tier %',
      v_price, v_min, p_tier;
  end if;

  -- 2. Tier B and A require an approved certification for this activity.
  if p_tier in ('A', 'B') and not exists (
    select 1 from verifications
    where user_id = v_uid and doc_type = 'certification'
      and activity_id = v_activity and status = 'approved'
  ) then
    raise exception 'tier % requires an approved certification for %', p_tier, p_activity_slug;
  end if;

  -- 3. Tier A additionally requires approved competition experience.
  if p_tier = 'A' and not exists (
    select 1 from verifications
    where user_id = v_uid and doc_type = 'competition'
      and activity_id = v_activity and status = 'approved'
  ) then
    raise exception 'tier A requires approved competition experience for %', p_activity_slug;
  end if;

  -- Enforce one offering (one tier) per activity on this listing.
  delete from listing_offerings
  where listing_id = v_listing and activity_id = v_activity;

  insert into listing_offerings (listing_id, activity_id, tier, price_ntd, is_free, session_minutes)
  values (
    v_listing, v_activity, p_tier,
    v_price,
    false, -- no free offerings; the platform floor is NT$400
    coalesce(p_session_minutes, 60)
  )
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
