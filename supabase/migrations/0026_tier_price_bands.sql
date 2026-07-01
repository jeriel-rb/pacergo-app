-- Enforced pricing + certified tiers. Two product rules, server-side:
--   1. Every offering's price must sit within its tier's band (NT$, inclusive).
--      Narrow bands stop intra-tier undercutting; the NT$600 floor guarantees a
--      livable rate. Kept in sync with @pacergo/shared TIER_PRICE_BANDS.
--        C: 600–800   B: 800–1200   A: 1200–1500
--   2. Tier B and Tier A are certified tiers — both require an approved
--      certification for that activity (previously only Tier A was gated, and
--      only in the UI). Tier A's extra competition-experience gate lands in 0027.

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
  v_max int;
  v_price int := coalesce(p_price_ntd, 0);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_listing from companion_listings where user_id = v_uid;
  if not found then raise exception 'create your listing first'; end if;
  select id into v_activity from activities where slug = p_activity_slug;
  if not found then raise exception 'unknown activity'; end if;

  -- 1. Price band per tier (inclusive). Keep in sync with TIER_PRICE_BANDS.
  v_min := case p_tier when 'C' then 600 when 'B' then 800 when 'A' then 1200 end;
  v_max := case p_tier when 'C' then 800 when 'B' then 1200 when 'A' then 1500 end;
  if v_price < v_min or v_price > v_max then
    raise exception 'price % is outside the NT$%–% band for tier %',
      v_price, v_min, v_max, p_tier;
  end if;

  -- 2. Tier B and A require an approved certification for this activity.
  if p_tier in ('A', 'B') and not exists (
    select 1 from verifications
    where user_id = v_uid and doc_type = 'certification'
      and activity_id = v_activity and status = 'approved'
  ) then
    raise exception 'tier % requires an approved certification for %', p_tier, p_activity_slug;
  end if;

  -- Enforce one offering (one tier) per activity on this listing.
  delete from listing_offerings
  where listing_id = v_listing and activity_id = v_activity;

  insert into listing_offerings (listing_id, activity_id, tier, price_ntd, is_free, session_minutes)
  values (
    v_listing, v_activity, p_tier,
    v_price,
    false, -- no free offerings; the platform floor is NT$600
    coalesce(p_session_minutes, 60)
  )
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
