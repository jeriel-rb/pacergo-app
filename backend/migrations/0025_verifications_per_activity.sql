-- Certifications are per-activity: a trainer must be approved for each activity
-- they want to offer at Tier A (a Gym-A cert does not unlock Running-A).
-- Also surfaces banner_url on the discovery feed (recommended_companions).

alter table verifications add column if not exists activity_id uuid references activities (id);

-- submit_verification gains the activity (required for certifications). Replace
-- the 3-arg version from 0024.
drop function if exists submit_verification(text, text, text);
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
  if p_doc_type not in ('certification', 'id') then raise exception 'invalid doc type'; end if;
  if coalesce(p_document_path, '') = '' then raise exception 'missing document'; end if;

  if p_doc_type = 'certification' then
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

-- Studio bundle: per-activity certification status, keyed by activity slug.
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

-- Admin queue: include the activity each certification is for.
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
    where ver.doc_type = 'certification'
  ) s;
  return v;
end;
$$;
grant execute on function list_pending_verifications() to authenticated;

-- Discovery feed: include banner_url so cards can show a cover photo.
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
    limit p_limit
  ) r;
$$;
grant execute on function recommended_companions to anon, authenticated;
