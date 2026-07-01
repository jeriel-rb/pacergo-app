-- Tier A = certification + competition experience. On top of the certified-tier
-- rule from 0026, Tier A additionally requires *approved competition experience*
-- for that activity: a separate document the trainer submits and an admin
-- reviews alongside the certification. Modelled as a new per-activity
-- verification doc_type = 'competition', reusing the whole submit→review→gate
-- pipeline.

-- ---------------------------------------------------------------------------
-- submit_verification: accept the new 'competition' doc type (per-activity,
-- like 'certification'). Replaces the 4-arg version from 0025.
-- ---------------------------------------------------------------------------
create or replace function submit_verification(
  p_doc_type text,
  p_document_path text,
  p_label text,
  p_activity_slug text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_activity uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_doc_type not in ('certification', 'competition', 'id') then
    raise exception 'invalid doc type';
  end if;
  if coalesce(p_document_path, '') = '' then raise exception 'missing document'; end if;

  if p_doc_type in ('certification', 'competition') then
    select id into v_activity from activities where slug = p_activity_slug;
    if not found then raise exception 'unknown activity'; end if;
  end if;

  insert into verifications (user_id, doc_type, document_path, label, activity_id, status)
  values (v_uid, p_doc_type, p_document_path, nullif(p_label, ''), v_activity, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function submit_verification(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- add_offering: Tier A now also requires approved competition experience for
-- the activity (in addition to the price band + certification from 0026).
-- ---------------------------------------------------------------------------
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
    false, -- no free offerings; the platform floor is NT$600
    coalesce(p_session_minutes, 60)
  )
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Studio bundle: add a per-activity `competitions` status map alongside the
-- existing `verifications` (certifications) map, so the editor can gate Tier A
-- on both.
-- ---------------------------------------------------------------------------
create or replace function my_listing()
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'is_companion', (select is_companion from users where id = auth.uid()),
    'verifications', (
      select coalesce(
        jsonb_object_agg(v.slug, jsonb_build_object('status', v.status, 'label', v.label)),
        '{}'::jsonb
      )
      from (
        select distinct on (a.slug) a.slug, ver.status, ver.label
        from verifications ver
        join activities a on a.id = ver.activity_id
        where ver.user_id = auth.uid()
          and ver.doc_type = 'certification'
          and ver.activity_id is not null
        order by a.slug,
          case ver.status when 'approved' then 2 when 'pending' then 1 else 0 end desc,
          ver.created_at desc
      ) v
    ),
    'competitions', (
      select coalesce(
        jsonb_object_agg(v.slug, jsonb_build_object('status', v.status, 'label', v.label)),
        '{}'::jsonb
      )
      from (
        select distinct on (a.slug) a.slug, ver.status, ver.label
        from verifications ver
        join activities a on a.id = ver.activity_id
        where ver.user_id = auth.uid()
          and ver.doc_type = 'competition'
          and ver.activity_id is not null
        order by a.slug,
          case ver.status when 'approved' then 2 when 'pending' then 1 else 0 end desc,
          ver.created_at desc
      ) v
    ),
    'listing', (
      select to_jsonb(l) from (
        select id, headline, bio_long, served_area, status, rating_avg, rating_count
        from companion_listings where user_id = auth.uid()
      ) l
    ),
    'offerings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'activity', a.slug, 'tier', o.tier,
        'price_ntd', o.price_ntd, 'is_free', o.is_free,
        'session_minutes', o.session_minutes
      ) order by o.tier, o.price_ntd), '[]'::jsonb)
      from listing_offerings o
      join activities a on a.id = o.activity_id
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = auth.uid()
    ),
    'availability', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', av.id, 'weekday', av.weekday,
        'start_minute', av.start_minute, 'end_minute', av.end_minute
      ) order by av.weekday, av.start_minute), '[]'::jsonb)
      from availability av where av.user_id = auth.uid()
    )
  );
$$;
grant execute on function my_listing() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin queue: include competition submissions too (doc_type carries the kind).
-- ---------------------------------------------------------------------------
create or replace function list_pending_verifications()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(s.obj order by s.ord, s.created_at desc), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
      'id', ver.id,
      'user_id', ver.user_id,
      'display_name', u.display_name,
      'photo_url', u.photo_url,
      'doc_type', ver.doc_type,
      'activity', a.slug,
      'label', ver.label,
      'document_path', ver.document_path,
      'status', ver.status,
      'notes', ver.notes,
      'created_at', ver.created_at,
      'reviewed_at', ver.reviewed_at
    ) as obj,
    case ver.status when 'pending' then 0 when 'approved' then 1 else 2 end as ord,
    ver.created_at
    from verifications ver
    join users u on u.id = ver.user_id
    left join activities a on a.id = ver.activity_id
    where ver.doc_type in ('certification', 'competition')
  ) s;
  return v;
end;
$$;
grant execute on function list_pending_verifications() to authenticated;

-- ---------------------------------------------------------------------------
-- Public profile: surface approved competition labels (a Tier A selling point)
-- alongside the existing certifications.
-- ---------------------------------------------------------------------------
create or replace function companion_profile(p_id uuid)
returns jsonb
language sql security definer set search_path = public stable as $$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'photo_url', p.photo_url,
    'banner_url', p.banner_url,
    'tier', h.tier,
    'activities', to_jsonb(coalesce(acts.activities, array[]::text[])),
    'home_area', coalesce(p.home_area, l.served_area, ''),
    'price_ntd', coalesce(h.price_ntd, 0), 'is_free', coalesce(h.is_free, false),
    'rating_avg', coalesce(l.rating_avg, 0), 'rating_count', coalesce(l.rating_count, 0),
    'experience_level', p.experience_level,
    'bio', coalesce(p.bio, l.bio_long, ''),
    'certifications', coalesce(certs.list, '[]'::jsonb),
    'competitions', coalesce(comps.list, '[]'::jsonb),
    'offerings', coalesce(off.offerings, '[]'::jsonb),
    'gym_memberships', '[]'::jsonb,
    'availability', coalesce(av.slots, '[]'::jsonb),
    'reviews', '[]'::jsonb,
    'manager', null,
    'is_bidding', false
  ) end
  from users p
  left join companion_listings l on l.user_id = p.id
  left join lateral (
    select distinct on (o.listing_id) o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    where o.listing_id = l.id
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ) h on true
  left join lateral (
    select array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    where o.listing_id = l.id
  ) acts on true
  left join lateral (
    select jsonb_agg(v.label order by v.created_at) as list
    from verifications v
    where v.user_id = p.id and v.doc_type = 'certification'
      and v.status = 'approved' and v.label is not null
  ) certs on true
  left join lateral (
    select jsonb_agg(v.label order by v.created_at) as list
    from verifications v
    where v.user_id = p.id and v.doc_type = 'competition'
      and v.status = 'approved' and v.label is not null
  ) comps on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'activity', a.slug, 'tier', o.tier, 'price_ntd', o.price_ntd,
      'is_free', o.is_free, 'session_minutes', o.session_minutes
    ) order by o.tier asc) as offerings
    from listing_offerings o
    join activities a on a.id = o.activity_id
    where o.listing_id = l.id
  ) off on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'weekday', av.weekday, 'start_minute', av.start_minute, 'end_minute', av.end_minute
    ) order by av.weekday, av.start_minute) as slots
    from availability av
    where av.user_id = p.id
  ) av on true
  where p.id = p_id and (l.status = 'active' or l.id is null);
$$;
grant execute on function companion_profile to anon, authenticated;
