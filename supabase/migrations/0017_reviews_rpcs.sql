-- Two-way reviews via RPCs + surface reviews on the public profile.

-- Submit (or update) the caller's review for a completed booking. Either party
-- may review the other once. Returns the review id.
create or replace function submit_review(
  p_booking_id uuid,
  p_rating int,
  p_comment text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b record;
  v_reviewee uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating out of range'; end if;

  select seeker_id, companion_id, status into b
  from bookings where id = p_booking_id;
  if not found then raise exception 'booking not found'; end if;
  if b.status <> 'completed' then raise exception 'booking not completed'; end if;

  if v_uid = b.seeker_id then
    v_reviewee := b.companion_id;
  elsif v_uid = b.companion_id then
    v_reviewee := b.seeker_id;
  else
    raise exception 'not a participant';
  end if;

  insert into reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
  values (p_booking_id, v_uid, v_reviewee, p_rating, nullif(btrim(p_comment), ''))
  on conflict (booking_id, reviewer_id)
  do update set rating = excluded.rating, comment = excluded.comment
  returning id into v_id;

  return v_id;
end;
$$;

-- The caller's own review for a booking (to toggle the review UI), or null.
create or replace function my_review_for_booking(p_booking_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(r)
  from (
    select id, rating, comment, created_at
    from reviews
    where booking_id = p_booking_id and reviewer_id = auth.uid()
  ) r;
$$;

-- Recreate companion_profile so the detail page shows real reviews of the
-- companion (reviewer name + rating + comment).
create or replace function companion_profile(p_id uuid)
returns jsonb
language sql security definer set search_path = public stable as $$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'photo_url', p.photo_url,
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
    'reviews', coalesce(rv.reviews, '[]'::jsonb),
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
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'author_name', coalesce(ru.display_name, '—'),
      'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at
    ) order by r.created_at desc) as reviews
    from reviews r
    join users ru on ru.id = r.reviewer_id
    where r.reviewee_id = p.id
  ) rv on true
  where p.id = p_id and (l.status = 'active' or l.id is null);
$$;

grant execute on function submit_review(uuid, int, text) to authenticated;
grant execute on function my_review_for_booking(uuid) to authenticated;
