-- Security + performance hardening sweep (full audit of 0001–0029).
--
-- 1. RPC-only writes, enforced at the GRANT level: anon/authenticated lose all
--    table write privileges (and anon loses reads). Every write path already
--    goes through a SECURITY DEFINER RPC, so client write policies are dropped.
--    This closes real holes: any user could UPDATE their own users row and set
--    is_admin = true, and listing owners could write rating_avg/rating_count or
--    insert offerings that bypass the tier/price gates in add_offering.
-- 2. SECURITY DEFINER functions get explicit ACLs (Postgres grants EXECUTE to
--    PUBLIC by default, so anon could call every RPC).
-- 3. Anon-facing profile RPCs no longer leak non-companion users' data.
-- 4. Blocks are enforced in booking + messaging; verification uploads must
--    point into the caller's own storage folder; input sizes are capped.
-- 5. Remaining RLS policies wrap auth.uid() in a scalar subquery (evaluated
--    once per statement, not per row); missing FK/partial/GIST indexes added;
--    storage buckets get size + MIME limits.
-- 6. Bug fixes: review upserts now recompute listing ratings; public-profile
--    reviews (lost in 0022's restatement) are restored, capped at 50.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Table privileges: clients read where policies allow, never write.
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on table
  users, activities, user_activities, companion_listings, listing_offerings,
  saved_companions, bookings, reviews, notifications, availability,
  availability_blocks, verifications, conversations, messages, blocks, reports
from anon;

revoke insert, update, delete, truncate, references, trigger on table
  users, activities, user_activities, companion_listings, listing_offerings,
  saved_companions, bookings, reviews, notifications, availability,
  availability_blocks, verifications, conversations, messages, blocks, reports
from authenticated;

-- Future tables created by migrations follow the same rule.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
-- Future functions are opt-in per role, never PUBLIC.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS: drop client write policies (writes are RPC-only now); recreate the
--    read policies with (select auth.uid()) so the check runs once per
--    statement instead of once per row.
-- ═══════════════════════════════════════════════════════════════════════════

-- users: the UPDATE policy allowed setting is_admin on one's own row.
drop policy if exists "users owner can update" on users;
drop policy if exists "users owner can insert" on users;
drop policy if exists "users owner can read" on users;
create policy "users owner can read"
  on users for select to authenticated using (id = (select auth.uid()));

-- user_activities
drop policy if exists "user_activities owner write" on user_activities;
drop policy if exists "user_activities owner read" on user_activities;
create policy "user_activities owner read"
  on user_activities for select to authenticated using (user_id = (select auth.uid()));

-- companion_listings: owner-manage allowed rating tampering + gate bypass.
drop policy if exists "listings owner manage" on companion_listings;
drop policy if exists "listings active readable" on companion_listings;
create policy "listings active readable"
  on companion_listings for select to authenticated
  using (status = 'active' or user_id = (select auth.uid()));

-- listing_offerings: owner-manage bypassed price floors + cert gates.
drop policy if exists "offerings owner manage" on listing_offerings;
drop policy if exists "offerings readable for active listings" on listing_offerings;
create policy "offerings readable for active listings"
  on listing_offerings for select to authenticated
  using (
    exists (
      select 1 from companion_listings l
      where l.id = listing_id
        and (l.status = 'active' or l.user_id = (select auth.uid()))
    )
  );

-- saved_companions
drop policy if exists "saved owner manage" on saved_companions;
drop policy if exists "saved owner read" on saved_companions;
create policy "saved owner read"
  on saved_companions for select to authenticated using (seeker_id = (select auth.uid()));

-- availability ("availability readable" using (true) stays as-is)
drop policy if exists "availability owner insert" on availability;
drop policy if exists "availability owner delete" on availability;

-- availability_blocks
drop policy if exists "blocks owner manage" on availability_blocks;
drop policy if exists "availability_blocks owner read" on availability_blocks;
create policy "availability_blocks owner read"
  on availability_blocks for select to authenticated using (user_id = (select auth.uid()));

-- verifications
drop policy if exists "verifications owner insert" on verifications;
drop policy if exists "verifications owner read" on verifications;
create policy "verifications owner read"
  on verifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "verifications admin read" on verifications;
create policy "verifications admin read"
  on verifications for select to authenticated using ((select is_platform_admin()));

-- bookings
drop policy if exists "bookings seeker insert" on bookings;
drop policy if exists "bookings parties read" on bookings;
create policy "bookings parties read"
  on bookings for select to authenticated
  using (seeker_id = (select auth.uid()) or companion_id = (select auth.uid()));

-- reviews ("reviews readable" using (true) stays as-is)
drop policy if exists "reviews author insert" on reviews;

-- notifications
drop policy if exists "notifications owner update" on notifications;
drop policy if exists "notifications owner read" on notifications;
create policy "notifications owner read"
  on notifications for select to authenticated using (user_id = (select auth.uid()));

-- conversations
drop policy if exists "conversations participant insert" on conversations;
drop policy if exists "conversations participant update" on conversations;
drop policy if exists "conversations participant read" on conversations;
create policy "conversations participant read"
  on conversations for select to authenticated
  using ((select auth.uid()) in (participant_a, participant_b));

-- messages (the read policy also authorizes the realtime stream)
drop policy if exists "messages sender insert" on messages;
drop policy if exists "messages participant read" on messages;
create policy "messages participant read"
  on messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.participant_a, c.participant_b)
    )
  );

-- blocks
drop policy if exists "blocks owner manage" on blocks;
drop policy if exists "blocks owner read" on blocks;
create policy "blocks owner read"
  on blocks for select to authenticated using (blocker_id = (select auth.uid()));

-- reports: write via report_user RPC; reads stay server-side (no client policy).
drop policy if exists "reports reporter insert" on reports;

-- Storage policies: same per-statement auth.uid() treatment.
drop policy if exists "verif docs owner insert" on storage.objects;
create policy "verif docs owner insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
drop policy if exists "verif docs owner read" on storage.objects;
create policy "verif docs owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
drop policy if exists "verif docs admin read" on storage.objects;
create policy "verif docs admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (select is_platform_admin()));

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "banners owner insert" on storage.objects;
create policy "banners owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "banners owner update" on storage.objects;
create policy "banners owner update" on storage.objects for update to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "banners owner delete" on storage.objects;
create policy "banners owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Storage buckets: server-side size + MIME limits (previously unlimited).
-- ═══════════════════════════════════════════════════════════════════════════

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']
where id = 'avatars';

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']
where id = 'banners';

update storage.buckets
set file_size_limit = 20971520, -- 20 MB
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
where id = 'verification-docs';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Schema integrity + performance indexes.
-- ═══════════════════════════════════════════════════════════════════════════

-- One offering per activity per listing: enforced in add_offering since 0023,
-- now also as a constraint (verified duplicate-free on live data).
create unique index if not exists listing_offerings_listing_activity_key
  on listing_offerings (listing_id, activity_id);

-- Geo search: nearby_companions was a sequential scan without this.
create index if not exists users_location_gix on users using gist (location)
  where location is not null;

-- FK / hot-path indexes.
create index if not exists reviews_reviewee_idx on reviews (reviewee_id);
create index if not exists reviews_reviewer_idx on reviews (reviewer_id);
create index if not exists listing_offerings_activity_idx on listing_offerings (activity_id);
create index if not exists saved_companions_companion_idx on saved_companions (companion_id);
create index if not exists blocks_blocked_idx on blocks (blocked_id);
create index if not exists conversations_booking_idx on conversations (booking_id);
create index if not exists bookings_offering_idx on bookings (offering_id);
create index if not exists user_activities_activity_idx on user_activities (activity_id);
create index if not exists messages_sender_idx on messages (sender_id);
create index if not exists reports_reporter_idx on reports (reporter_id);
create index if not exists reports_reported_idx on reports (reported_id);
create index if not exists reports_booking_idx on reports (booking_id);
create index if not exists verifications_gate_idx
  on verifications (user_id, doc_type, activity_id) where status = 'approved';
create index if not exists companion_listings_active_idx
  on companion_listings (status) where status = 'active';

-- Unread counters (bell badge / chat badges) hit only unread rows now.
create index if not exists notifications_unread_idx
  on notifications (user_id) where read_at is null;
create index if not exists messages_unread_idx
  on messages (conversation_id) where read_at is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Trigger hygiene + rating-recompute bug fix.
-- ═══════════════════════════════════════════════════════════════════════════

-- Pin search_path (mutable-search-path advisor finding).
create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Cap the display name copied from OAuth metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name, photo_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- submit_review upserts (edit = ON CONFLICT DO UPDATE), but the recompute
-- trigger only fired on INSERT, so edited ratings never reached rating_avg.
drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert or update of rating on reviews
  for each row execute function recompute_listing_rating();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RPC fixes: data leaks, block enforcement, input caps, abuse guards.
-- ═══════════════════════════════════════════════════════════════════════════

-- update_my_profile: length caps (columns were unbounded text).
create or replace function update_my_profile(
  p_display_name text,
  p_bio text,
  p_experience_level experience_level,
  p_home_area text,
  p_gender text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_display_name, '')) > 80 then raise exception 'display name too long'; end if;
  if char_length(coalesce(p_bio, '')) > 2000 then raise exception 'bio too long'; end if;
  if char_length(coalesce(p_home_area, '')) > 120 then raise exception 'home area too long'; end if;
  if char_length(coalesce(p_gender, '')) > 40 then raise exception 'gender too long'; end if;

  update users set
    display_name = coalesce(p_display_name, display_name),
    bio = p_bio,
    experience_level = p_experience_level,
    home_area = p_home_area,
    gender = p_gender
  where id = auth.uid();
end $$;

-- Photo / banner URLs: must be http(s) and bounded (was arbitrary text).
create or replace function set_my_photo_url(p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and (char_length(p_url) > 2048 or p_url !~ '^https?://') then
    raise exception 'invalid url';
  end if;
  update users set photo_url = p_url where id = auth.uid();
end $$;

create or replace function set_my_banner_url(p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and (char_length(p_url) > 2048 or p_url !~ '^https?://') then
    raise exception 'invalid url';
  end if;
  update users set banner_url = p_url where id = auth.uid();
end $$;

-- complete_onboarding: caps.
create or replace function complete_onboarding(
  p_display_name text,
  p_experience_level experience_level,
  p_home_area text,
  p_activity_ids uuid[]
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if char_length(coalesce(p_display_name, '')) > 80 then raise exception 'display name too long'; end if;
  if char_length(coalesce(p_home_area, '')) > 120 then raise exception 'home area too long'; end if;
  if coalesce(array_length(p_activity_ids, 1), 0) > 32 then raise exception 'too many activities'; end if;

  update users set
    display_name = coalesce(nullif(p_display_name, ''), display_name),
    experience_level = coalesce(p_experience_level, experience_level),
    home_area = p_home_area,
    onboarding_completed = true
  where id = v_uid;

  delete from user_activities where user_id = v_uid;
  insert into user_activities (user_id, activity_id)
  select v_uid, unnest(p_activity_ids)
  on conflict do nothing;
end $$;

-- toggle_saved_companion: no self-saves.
create or replace function toggle_saved_companion(p_companion_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = p_companion_id then raise exception 'cannot save yourself'; end if;

  delete from saved_companions
  where seeker_id = auth.uid() and companion_id = p_companion_id;
  if found then
    return false;
  end if;

  insert into saved_companions (seeker_id, companion_id)
  values (auth.uid(), p_companion_id)
  on conflict do nothing;
  return true;
end $$;

-- get_companion: previously returned ANY user's profile fields to any
-- authenticated caller; now companions with an active listing only.
drop function if exists get_companion(uuid);
create function get_companion(p_id uuid)
returns table (
  companion_id uuid, display_name text, photo_url text, banner_url text, bio text,
  experience_level experience_level, home_area text, rating_avg numeric, rating_count int
)
language sql security definer set search_path = public stable as $$
  select p.id, p.display_name, p.photo_url, p.banner_url, p.bio, p.experience_level,
         p.home_area, coalesce(l.rating_avg, 0), coalesce(l.rating_count, 0)
  from users p
  join companion_listings l on l.user_id = p.id
  where p.id = p_id and l.status = 'active';
$$;

-- nearby_companions: clamp the radius (was unbounded), mark stable.
create or replace function nearby_companions(
  center_lat double precision,
  center_lng double precision,
  radius_m double precision default 20000,
  filter_activity text default null,
  filter_tier tier_level default null,
  max_price int default null
)
returns table (
  companion_id uuid, display_name text, photo_url text, experience_level experience_level,
  home_area text, tier tier_level, activity_slug text, price_ntd int, is_free boolean,
  distance_m double precision
)
language sql security definer set search_path = public stable as $$
  select
    p.id, p.display_name, p.photo_url, p.experience_level, p.home_area,
    o.tier, a.slug, o.price_ntd, o.is_free,
    round(ST_Distance(p.location, ST_MakePoint(center_lng, center_lat)::geography)) as distance_m
  from companion_listings l
  join users p on p.id = l.user_id
  join listing_offerings o on o.listing_id = l.id
  join activities a on a.id = o.activity_id
  where l.status = 'active'
    and p.location is not null
    and ST_DWithin(
      p.location,
      ST_MakePoint(center_lng, center_lat)::geography,
      least(greatest(coalesce(radius_m, 20000), 100), 100000)
    )
    and (filter_activity is null or a.slug = filter_activity)
    and (filter_tier is null or o.tier = filter_tier)
    and (max_price is null or o.price_ntd <= max_price)
    and not exists (
      select 1 from blocks bl
      where (bl.blocker_id = auth.uid() and bl.blocked_id = p.id)
         or (bl.blocker_id = p.id and bl.blocked_id = auth.uid())
    )
  order by distance_m asc
  limit 100;
$$;

-- recommended_companions: clamp p_limit (anon could request unbounded rows).
create or replace function recommended_companions(
  p_activity text default null,
  p_limit int default 24
)
returns jsonb
language sql security definer set search_path = public stable as $$
  with headline as (
    select distinct on (o.listing_id)
      o.listing_id, o.tier, o.price_ntd, o.is_free
    from listing_offerings o
    order by o.listing_id, o.tier asc, o.price_ntd desc
  ),
  acts as (
    select o.listing_id, array_agg(distinct a.slug order by a.slug) as activities
    from listing_offerings o
    join activities a on a.id = o.activity_id
    group by o.listing_id
  )
  select coalesce(
    jsonb_agg(r.obj order by r.rating_avg desc, r.rating_count desc),
    '[]'::jsonb
  )
  from (
    select
      jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'photo_url', p.photo_url,
        'banner_url', p.banner_url,
        'tier', h.tier, 'activities', to_jsonb(acts.activities),
        'home_area', coalesce(p.home_area, l.served_area, ''),
        'price_ntd', h.price_ntd, 'is_free', h.is_free,
        'rating_avg', l.rating_avg, 'rating_count', l.rating_count,
        'experience_level', p.experience_level
      ) as obj,
      l.rating_avg, l.rating_count
    from companion_listings l
    join users p on p.id = l.user_id
    join headline h on h.listing_id = l.id
    join acts on acts.listing_id = l.id
    where l.status = 'active'
      and (p_activity is null or p_activity = any (acts.activities))
    order by l.rating_avg desc, l.rating_count desc
    limit least(greatest(coalesce(p_limit, 24), 1), 48)
  ) r;
$$;

-- companion_profile: previously `(l.status = 'active' or l.id is null)` leaked
-- non-companion users' profiles to anon; now active listings only. Also
-- restores the reviews list (dropped by 0022's restatement), capped at 50.
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
    'reviews', coalesce(rv.reviews, '[]'::jsonb),
    'manager', null,
    'is_bidding', false
  ) end
  from users p
  join companion_listings l on l.user_id = p.id
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
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'author_name', coalesce(ru.display_name, '—'),
      'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at
    ) order by r.created_at desc) as reviews
    from (
      select r0.id, r0.reviewer_id, r0.rating, r0.comment, r0.created_at
      from reviews r0
      where r0.reviewee_id = p.id
      order by r0.created_at desc
      limit 50
    ) r
    join users ru on ru.id = r.reviewer_id
  ) rv on true
  where p.id = p_id and l.status = 'active';
$$;

-- create_booking: enforce blocks, bound inputs, reject past times, and stop
-- duplicate open requests against the same companion (notification spam).
create or replace function create_booking(
  p_companion_id uuid,
  p_offering_id uuid,
  p_scheduled_start timestamptz,
  p_duration_min int,
  p_location_name text,
  p_seeker_note text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_seeker uuid := auth.uid();
  v_id uuid;
  o record;
  seeker_u record;
  comp_u record;
begin
  if v_seeker is null then raise exception 'not authenticated'; end if;
  if v_seeker = p_companion_id then raise exception 'cannot book yourself'; end if;
  if char_length(coalesce(p_seeker_note, '')) > 2000 then raise exception 'note too long'; end if;
  if char_length(coalesce(p_location_name, '')) > 200 then raise exception 'location too long'; end if;
  if p_scheduled_start is not null and p_scheduled_start < now() - interval '1 hour' then
    raise exception 'cannot book a time in the past';
  end if;
  if exists (
    select 1 from blocks
    where (blocker_id = v_seeker and blocked_id = p_companion_id)
       or (blocker_id = p_companion_id and blocked_id = v_seeker)
  ) then
    raise exception 'booking not available';
  end if;
  if exists (
    select 1 from bookings
    where seeker_id = v_seeker and companion_id = p_companion_id and status = 'requested'
  ) then
    raise exception 'you already have a pending request with this companion';
  end if;

  select lo.tier, lo.price_ntd, lo.is_free, lo.session_minutes, a.slug as activity_slug
    into o
  from listing_offerings lo
  join companion_listings cl on cl.id = lo.listing_id
  join activities a on a.id = lo.activity_id
  where lo.id = p_offering_id
    and cl.user_id = p_companion_id
    and cl.status = 'active';
  if not found then raise exception 'offering not available'; end if;

  select display_name, photo_url into seeker_u from users where id = v_seeker;
  select display_name, photo_url into comp_u from users where id = p_companion_id;

  insert into bookings (
    seeker_id, companion_id, offering_id, activity_slug, tier, status,
    scheduled_start, duration_min, location_name, agreed_price, is_free,
    seeker_note, seeker_name, seeker_photo, companion_name, companion_photo
  ) values (
    v_seeker, p_companion_id, p_offering_id, o.activity_slug, o.tier, 'requested',
    p_scheduled_start,
    least(greatest(coalesce(p_duration_min, o.session_minutes), 15), 480),
    p_location_name,
    o.price_ntd, o.is_free, p_seeker_note,
    seeker_u.display_name, seeker_u.photo_url,
    comp_u.display_name, comp_u.photo_url
  )
  returning id into v_id;

  return v_id;
end $$;

-- start_conversation: blocked pairs cannot open a chat.
create or replace function start_conversation(p_other_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a uuid;
  b uuid;
  v_id uuid;
  pa record;
  pb record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_uid = p_other_id then raise exception 'cannot message yourself'; end if;
  if not has_booking_with(p_other_id) then
    raise exception 'a booking is required before messaging';
  end if;
  if exists (
    select 1 from blocks
    where (blocker_id = v_uid and blocked_id = p_other_id)
       or (blocker_id = p_other_id and blocked_id = v_uid)
  ) then
    raise exception 'messaging unavailable';
  end if;

  a := least(v_uid, p_other_id);
  b := greatest(v_uid, p_other_id);
  select display_name, photo_url into pa from users where id = a;
  select display_name, photo_url into pb from users where id = b;

  insert into conversations (participant_a, participant_b, a_name, a_photo, b_name, b_photo)
  values (a, b, pa.display_name, pa.photo_url, pb.display_name, pb.photo_url)
  on conflict (participant_a, participant_b)
  do update set last_message_at = conversations.last_message_at
  returning id into v_id;

  return v_id;
end $$;

-- send_message: blocked pairs cannot keep messaging in an existing thread.
create or replace function send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_other uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception 'empty message'; end if;
  if char_length(p_body) > 4000 then raise exception 'message too long'; end if;

  select case when participant_a = v_uid then participant_b else participant_a end
    into v_other
  from conversations
  where id = p_conversation_id and (participant_a = v_uid or participant_b = v_uid);
  if v_other is null then raise exception 'not a participant'; end if;

  if exists (
    select 1 from blocks
    where (blocker_id = v_uid and blocked_id = v_other)
       or (blocker_id = v_other and blocked_id = v_uid)
  ) then
    raise exception 'messaging unavailable';
  end if;

  insert into messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_uid, btrim(p_body))
  returning id into v_id;
  return v_id;
end $$;

-- submit_verification: the document must live in the caller's own storage
-- folder, labels are capped, and duplicate pending/approved submissions for
-- the same (doc_type, activity) are rejected (admin-queue spam guard).
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
  if position(v_uid::text || '/' in p_document_path) <> 1 then
    raise exception 'invalid document path';
  end if;
  if char_length(coalesce(p_label, '')) > 200 then raise exception 'label too long'; end if;

  if p_doc_type in ('certification', 'competition') then
    select id into v_activity from activities where slug = p_activity_slug;
    if not found then raise exception 'unknown activity'; end if;
  end if;

  if exists (
    select 1 from verifications
    where user_id = v_uid
      and doc_type = p_doc_type
      and (v_activity is null or activity_id = v_activity)
      and status in ('pending', 'approved')
  ) then
    raise exception 'a submission for this is already pending or approved';
  end if;

  insert into verifications (user_id, doc_type, document_path, label, activity_id, status)
  values (v_uid, p_doc_type, p_document_path, nullif(p_label, ''), v_activity, 'pending')
  returning id into v_id;
  return v_id;
end $$;

-- review_verification: surface a miss instead of silently succeeding.
create or replace function review_verification(
  p_id uuid,
  p_status text,
  p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid status'; end if;
  update verifications set
    status = p_status,
    notes = nullif(p_notes, ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id;
  if not found then raise exception 'verification not found'; end if;
end $$;

-- upsert_my_listing: length caps for the free-text fields.
create or replace function upsert_my_listing(
  p_headline text,
  p_bio_long text,
  p_served_area text,
  p_status text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_status not in ('draft', 'active', 'paused') then
    raise exception 'invalid status';
  end if;
  if char_length(coalesce(p_headline, '')) > 120 then raise exception 'headline too long'; end if;
  if char_length(coalesce(p_bio_long, '')) > 4000 then raise exception 'bio too long'; end if;
  if char_length(coalesce(p_served_area, '')) > 120 then raise exception 'served area too long'; end if;

  update users set is_companion = true where id = v_uid;

  insert into companion_listings (user_id, headline, bio_long, served_area, status)
  values (v_uid, p_headline, p_bio_long, p_served_area, p_status)
  on conflict (user_id) do update set
    headline = excluded.headline,
    bio_long = excluded.bio_long,
    served_area = excluded.served_area,
    status = excluded.status
  returning id into v_id;

  return v_id;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Function ACLs: strip the implicit PUBLIC EXECUTE from every app function,
--    then grant back exactly what each audience needs. (Trigger functions get
--    no grants — only their triggers invoke them.)
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'set_updated_at', 'handle_new_user', 'notify_booking_event',
        'recompute_listing_rating', 'bump_conversation',
        'nearby_companions', 'get_companion', 'delete_account',
        'recommended_companions', 'companion_profile', 'delete_current_user',
        'update_my_profile', 'set_my_photo_url', 'set_my_banner_url', 'get_my_profile',
        'toggle_saved_companion', 'my_saved_companion_ids', 'saved_companions_feed',
        'companion_offerings', 'create_booking', 'my_bookings', 'booking_detail',
        'accept_booking', 'decline_booking', 'cancel_booking', 'complete_booking',
        'set_weekly_target', 'weekly_progress',
        'submit_review', 'my_review_for_booking',
        'my_notifications', 'unread_notification_count', 'mark_notifications_read',
        'has_booking_with', 'start_conversation', 'my_conversations',
        'conversation_header', 'conversation_messages', 'send_message',
        'mark_conversation_read',
        'my_listing', 'upsert_my_listing', 'add_offering', 'remove_offering',
        'add_availability', 'remove_availability', 'set_my_availability',
        'is_platform_admin', 'am_i_admin',
        'submit_verification', 'list_pending_verifications', 'review_verification',
        'complete_onboarding', 'my_blocked_ids', 'block_user', 'unblock_user',
        'report_user'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Public (anon) surface: read-only web discovery, nothing else.
grant execute on function recommended_companions(text, int) to anon, authenticated;
grant execute on function companion_profile(uuid) to anon, authenticated;
grant execute on function companion_offerings(uuid) to anon, authenticated;

-- Signed-in surface.
grant execute on function nearby_companions(double precision, double precision, double precision, text, tier_level, int) to authenticated;
grant execute on function get_companion(uuid) to authenticated;
grant execute on function delete_account() to authenticated;
grant execute on function delete_current_user() to authenticated;
grant execute on function update_my_profile(text, text, experience_level, text, text) to authenticated;
grant execute on function set_my_photo_url(text) to authenticated;
grant execute on function set_my_banner_url(text) to authenticated;
grant execute on function get_my_profile() to authenticated;
grant execute on function toggle_saved_companion(uuid) to authenticated;
grant execute on function my_saved_companion_ids() to authenticated;
grant execute on function saved_companions_feed() to authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, int, text, text) to authenticated;
grant execute on function my_bookings() to authenticated;
grant execute on function booking_detail(uuid) to authenticated;
grant execute on function accept_booking(uuid) to authenticated;
grant execute on function decline_booking(uuid) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;
grant execute on function complete_booking(uuid) to authenticated;
grant execute on function set_weekly_target(int) to authenticated;
grant execute on function weekly_progress() to authenticated;
grant execute on function submit_review(uuid, int, text) to authenticated;
grant execute on function my_review_for_booking(uuid) to authenticated;
grant execute on function my_notifications() to authenticated;
grant execute on function unread_notification_count() to authenticated;
grant execute on function mark_notifications_read() to authenticated;
grant execute on function has_booking_with(uuid) to authenticated;
grant execute on function start_conversation(uuid) to authenticated;
grant execute on function my_conversations() to authenticated;
grant execute on function conversation_header(uuid) to authenticated;
grant execute on function conversation_messages(uuid) to authenticated;
grant execute on function send_message(uuid, text) to authenticated;
grant execute on function mark_conversation_read(uuid) to authenticated;
grant execute on function my_listing() to authenticated;
grant execute on function upsert_my_listing(text, text, text, text) to authenticated;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
grant execute on function remove_offering(uuid) to authenticated;
grant execute on function add_availability(int, int, int) to authenticated;
grant execute on function remove_availability(uuid) to authenticated;
grant execute on function set_my_availability(jsonb) to authenticated;
grant execute on function is_platform_admin() to authenticated;
grant execute on function am_i_admin() to authenticated;
grant execute on function submit_verification(text, text, text, text) to authenticated;
grant execute on function list_pending_verifications() to authenticated;
grant execute on function review_verification(uuid, text, text) to authenticated;
grant execute on function complete_onboarding(text, experience_level, text, uuid[]) to authenticated;
grant execute on function my_blocked_ids() to authenticated;
grant execute on function block_user(uuid) to authenticated;
grant execute on function unblock_user(uuid) to authenticated;
grant execute on function report_user(uuid, text, text, uuid) to authenticated;
