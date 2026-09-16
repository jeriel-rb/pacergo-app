-- Favorites (saved companions) via RPCs.

-- Toggle a companion in the caller's saved list. Returns true if now saved.
create or replace function toggle_saved_companion(p_companion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from saved_companions
  where seeker_id = auth.uid() and companion_id = p_companion_id;
  if found then
    return false;
  end if;

  insert into saved_companions (seeker_id, companion_id)
  values (auth.uid(), p_companion_id)
  on conflict do nothing;
  return true;
end;
$$;

-- The caller's saved companion ids, as a JSON array.
create or replace function my_saved_companion_ids()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(companion_id), '[]'::jsonb)
  from saved_companions
  where seeker_id = auth.uid();
$$;

-- Trainer summaries (same shape as recommended_companions) for the caller's
-- saved companions that still have an active listing.
create or replace function saved_companions_feed()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
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
    join saved_companions sc
      on sc.companion_id = l.user_id and sc.seeker_id = auth.uid()
    where l.status = 'active'
    order by l.rating_avg desc, l.rating_count desc
  ) r;
$$;

grant execute on function toggle_saved_companion(uuid) to authenticated;
grant execute on function my_saved_companion_ids() to authenticated;
grant execute on function saved_companions_feed() to authenticated;
