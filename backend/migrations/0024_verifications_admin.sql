-- Tier A gating: trainers submit a certification (PDF) for review; a platform
-- admin approves or rejects it. Only an approved certification unlocks Tier A.
-- Adds the admin role, the review surface (RPCs), and wires approved certs into
-- the public profile + the caller's studio bundle.

-- Platform admin flag + a label for the submitted certification.
alter table users add column if not exists is_admin boolean not null default false;
alter table verifications add column if not exists label text;

-- Private bucket for verification documents. The policies in 0005 referenced it
-- but the bucket itself was never created.
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

-- Restrict PDF uploads via the object name convention `<uid>/cert-*.pdf`; size
-- is validated client-side. Files are private (signed URLs only).

-- ---------------------------------------------------------------------------
-- Admin role helper (security definer → safe to call from RLS policies).
-- ---------------------------------------------------------------------------
create or replace function is_platform_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from users where id = auth.uid()), false);
$$;
grant execute on function is_platform_admin() to authenticated;

-- Thin wrapper for the client (nav gating).
create or replace function am_i_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select is_platform_admin();
$$;
grant execute on function am_i_admin() to authenticated;

-- Admins can read every verification row + the documents in the private bucket.
drop policy if exists "verifications admin read" on verifications;
create policy "verifications admin read" on verifications for select to authenticated
  using (is_platform_admin());

drop policy if exists "verif docs admin read" on storage.objects;
create policy "verif docs admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and is_platform_admin());

-- ---------------------------------------------------------------------------
-- Submit a verification document (trainer). Returns the new row id.
-- ---------------------------------------------------------------------------
create or replace function submit_verification(
  p_doc_type text,
  p_document_path text,
  p_label text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_doc_type not in ('certification', 'id') then raise exception 'invalid doc type'; end if;
  if coalesce(p_document_path, '') = '' then raise exception 'missing document'; end if;

  insert into verifications (user_id, doc_type, document_path, label, status)
  values (v_uid, p_doc_type, p_document_path, nullif(p_label, ''), 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function submit_verification(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list every certification request (pending first), with applicant info.
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
    where ver.doc_type = 'certification'
  ) s;
  return v;
end;
$$;
grant execute on function list_pending_verifications() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: approve or reject a verification.
-- ---------------------------------------------------------------------------
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
end;
$$;
grant execute on function review_verification(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Studio bundle: include the caller's certification verification status so the
-- offerings editor can lock/unlock Tier A.
-- ---------------------------------------------------------------------------
create or replace function my_listing()
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'is_companion', (select is_companion from users where id = auth.uid()),
    'verification', (
      select to_jsonb(v) from (
        select status, label, created_at
        from verifications
        where user_id = auth.uid() and doc_type = 'certification'
        order by case status when 'approved' then 2 when 'pending' then 1 else 0 end desc,
                 created_at desc
        limit 1
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
-- Public profile: surface approved certification labels + banner_url.
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
