-- Profile banner (cover) photo: a wide image shown behind the avatar on the
-- "Me" tab and as the hero background on the public trainer detail page.
-- Mirrors the avatar design (public bucket, owner-scoped writes, stable URL).

alter table users add column if not exists banner_url text;

-- ---------------------------------------------------------------------------
-- Banners storage bucket (public read; owner-only writes scoped to their folder)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "banners public read" on storage.objects;
create policy "banners public read"
  on storage.objects for select
  using (bucket_id = 'banners');

drop policy if exists "banners owner insert" on storage.objects;
create policy "banners owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "banners owner update" on storage.objects;
create policy "banners owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "banners owner delete" on storage.objects;
create policy "banners owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Set or clear the caller's banner URL (null clears it).
create or replace function set_my_banner_url(p_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update users set banner_url = p_url where id = auth.uid();
$$;
grant execute on function set_my_banner_url(text) to authenticated;

-- Surface banner_url in the caller's own profile read.
create or replace function get_my_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t) from (
    select display_name, photo_url, banner_url, bio, experience_level, home_area, gender,
           is_companion
    from users
    where id = auth.uid()
  ) t;
$$;
grant execute on function get_my_profile() to authenticated;

-- Surface banner_url on the public profile (anon). Restated in full per the
-- repo convention; certifications stay empty here and are wired in 0024.
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
    'certifications', '[]'::jsonb,
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
