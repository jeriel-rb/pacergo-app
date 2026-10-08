-- Tier C proof + trainer eligibility.
--
-- Client rule (2026-10-08): every tier is admin-reviewed, including C. C needs at
-- least one verifiable sports-background proof per activity (course record,
-- school/department, school team, or matching competition history); B needs a
-- coach certification; A needs B plus competition/award proof. All trainers
-- must be 18+ and confirm the information they provide is true.
--
-- * verifications.doc_type gains 'background' (the Tier C proof, per activity).
-- * users.trainer_attested_at records the truthfulness confirmation;
--   confirm_trainer_eligibility() saves it with the birthdate (18+ enforced).
-- * Every proof upload and the trainer application require eligibility.
-- * The first application needs a proof on file for each offered activity and
--   can't be approved until those proofs are approved. Approved trainers adding
--   a new Tier C activity need an approved proof for it first.
-- * my_listing() returns backgrounds + eligibility; the admin queue lists
--   background proofs.

alter table verifications drop constraint if exists verifications_doc_type_check;
alter table verifications add constraint verifications_doc_type_check
  check (doc_type in ('certification', 'competition', 'background', 'id', 'application'));

alter table users add column if not exists trainer_attested_at timestamptz;

-- 18+ with a recorded truthfulness confirmation.
create or replace function is_trainer_eligible(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select u.trainer_attested_at is not null
       and u.birthdate is not null
       and u.birthdate <= (current_date - interval '18 years')::date
    from users u where u.id = p_user_id
  ), false);
$$;

-- A Tier C qualification for this activity: a background proof, or a
-- certification (which also qualifies for B), in one of the given statuses.
create or replace function has_activity_proof(p_user_id uuid, p_activity_id uuid, p_statuses text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from verifications
    where user_id = p_user_id
      and activity_id = p_activity_id
      and doc_type in ('background', 'certification')
      and status = any (p_statuses)
  );
$$;

create or replace function confirm_trainer_eligibility(p_birthdate date, p_attested boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_birthdate date;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_attested is not true then raise exception 'attestation_required'; end if;
  if p_birthdate is not null and (p_birthdate > current_date or p_birthdate < date '1900-01-01') then
    raise exception 'invalid birthdate';
  end if;
  update users set birthdate = coalesce(p_birthdate, birthdate)
  where id = v_uid
  returning birthdate into v_birthdate;
  if v_birthdate is null then raise exception 'birthdate_required'; end if;
  if v_birthdate > (current_date - interval '18 years')::date then raise exception 'under_18'; end if;
  update users set trainer_attested_at = now() where id = v_uid;
end;
$$;

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
  if p_doc_type not in ('certification', 'competition', 'background', 'id') then
    raise exception 'invalid doc type';
  end if;
  if coalesce(p_document_path, '') = '' then raise exception 'missing document'; end if;
  if position(v_uid::text || '/' in p_document_path) <> 1 then
    raise exception 'invalid document path';
  end if;
  if char_length(coalesce(p_label, '')) > 200 then raise exception 'label too long'; end if;
  if p_doc_type in ('certification', 'competition', 'background') and btrim(coalesce(p_label, '')) = '' then
    raise exception 'certification name required';
  end if;

  if p_doc_type in ('certification', 'competition', 'background') then
    -- Every trainer proof needs the 18+ / truthful-information confirmation.
    if not is_trainer_eligible(v_uid) then raise exception 'eligibility_required'; end if;
    select id into v_activity from activities where slug = p_activity_slug;
    if not found then raise exception 'unknown activity'; end if;
  end if;

  if p_doc_type in ('certification', 'competition') then

    -- Submit for review is the only write into the trainer-request queue.
    -- A price plan and a bookable slot have to exist before that write.
    if not exists (
      select 1 from listing_offerings o
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = v_uid
    ) or not exists (
      select 1 from availability av where av.user_id = v_uid
    ) then
      raise exception 'setup_required';
    end if;
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

create or replace function submit_trainer_application()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not is_trainer_eligible(v_uid) then raise exception 'eligibility_required'; end if;
  if not exists (
    select 1 from listing_offerings o
    join companion_listings cl on cl.id = o.listing_id
    where cl.user_id = v_uid
  ) or not exists (
    select 1 from availability av where av.user_id = v_uid
  ) then
    raise exception 'setup_required';
  end if;
  -- Even Tier C needs proof: every activity offered has a background proof
  -- or a certification on file (pending or approved).
  if exists (
    select 1 from listing_offerings o
    join companion_listings cl on cl.id = o.listing_id
    where cl.user_id = v_uid
      and not has_activity_proof(v_uid, o.activity_id, array['pending', 'approved'])
  ) then
    raise exception 'proof_required';
  end if;
  if exists (
    select 1 from verifications
    where user_id = v_uid
      and doc_type = 'application'
      and status in ('pending', 'approved')
  ) then
    raise exception 'a submission for this is already pending or approved';
  end if;

  insert into verifications (user_id, doc_type, document_path, label, activity_id, status)
  values (v_uid, 'application', null, null, null, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

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

  -- 1b. Tier C: an approved trainer adding an activity needs an approved
  --     proof for it. A first-time applicant's listing is still a draft; the
  --     application can't be approved until each activity's proof is.
  if p_tier = 'C'
    and exists (select 1 from users where id = v_uid and is_companion)
    and not has_activity_proof(v_uid, v_activity, array['approved'])
  then
    raise exception 'tier C requires an approved proof for %', p_activity_slug;
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

create or replace function review_verification(
  p_id uuid,
  p_status text,
  p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ver verifications%rowtype;
  v_activity text;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid status'; end if;
  -- A trainer application is only approvable once every offered activity's
  -- proof (background or certification) has been approved.
  if p_status = 'approved' and exists (
    select 1 from verifications v
    join companion_listings cl on cl.user_id = v.user_id
    join listing_offerings o on o.listing_id = cl.id
    where v.id = p_id and v.doc_type = 'application'
      and not has_activity_proof(v.user_id, o.activity_id, array['approved'])
  ) then
    raise exception 'proof_not_approved';
  end if;
  update verifications set
    status = p_status,
    notes = nullif(p_notes, ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id
  returning * into v_ver;
  if not found then raise exception 'verification not found'; end if;

  -- Approving a first trainer application, or a certification for someone who
  -- is not a trainer yet, is what grants the trainer role.
  if p_status = 'approved' and v_ver.doc_type in ('application', 'certification') then
    if not exists (select 1 from users where id = v_ver.user_id and is_companion) then
      update companion_listings
      set status = 'active'
      where user_id = v_ver.user_id and status = 'draft';
    end if;
    update users set is_companion = true where id = v_ver.user_id;
  end if;

  -- The home card reads the plan's tier. Approving a certification promotes
  -- that activity from C to B; approving competition proof promotes it to A.
  -- A price under the new floor is raised to the floor.
  if p_status = 'approved' and v_ver.doc_type = 'certification' and v_ver.activity_id is not null then
    update listing_offerings o
    set tier = 'B',
        price_ntd = greatest(o.price_ntd, 800)
    from companion_listings cl
    where o.listing_id = cl.id
      and cl.user_id = v_ver.user_id
      and o.activity_id = v_ver.activity_id
      and o.tier = 'C';
  end if;

  if p_status = 'approved' and v_ver.doc_type = 'competition' and v_ver.activity_id is not null then
    update listing_offerings o
    set tier = 'A',
        price_ntd = greatest(o.price_ntd, 1200)
    from companion_listings cl
    where o.listing_id = cl.id
      and cl.user_id = v_ver.user_id
      and o.activity_id = v_ver.activity_id
      and o.tier in ('B', 'C')
      and exists (
        select 1 from verifications cert
        where cert.user_id = v_ver.user_id
          and cert.activity_id = v_ver.activity_id
          and cert.doc_type = 'certification'
          and cert.status = 'approved'
      );
  end if;

  -- Tell the applicant. The payload carries the reviewer's reason so the
  -- notifications page can show why a request was rejected.
  select slug into v_activity from activities where id = v_ver.activity_id;
  insert into notifications (user_id, type, payload)
  values (
    v_ver.user_id,
    'verification_' || p_status,
    jsonb_build_object(
      'verification_id', v_ver.id,
      'status', p_status,
      'doc_type', v_ver.doc_type,
      'activity', v_activity,
      'label', v_ver.label,
      'notes', v_ver.notes
    )
  );
end $$;

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
      'reviewed_at', ver.reviewed_at,
      'reviewer_name', reviewer.display_name
    ) as obj,
    case ver.status when 'pending' then 0 when 'approved' then 1 else 2 end as ord,
    ver.created_at
    from verifications ver
    join users u on u.id = ver.user_id
    left join activities a on a.id = ver.activity_id
    left join users reviewer on reviewer.id = ver.reviewed_by
    where ver.doc_type in ('certification', 'competition', 'background', 'application')

    union all

    -- Trainers added directly (trainer role) who never submitted a request.
    -- They are already trainers, so the queue shows them as approved rather
    -- than as a missing request. No verification row is inserted: an approved
    -- certification would unlock tier B/A offerings.
    select jsonb_build_object(
      'id', u.id,
      'user_id', u.id,
      'display_name', u.display_name,
      'photo_url', u.photo_url,
      'doc_type', null,
      'activity', null,
      'label', null,
      'document_path', null,
      'status', 'approved',
      'notes', null,
      'created_at', u.created_at,
      'reviewed_at', null,
      'reviewer_name', null
    ) as obj,
    1 as ord,
    u.created_at
    from users u
    where u.is_companion
      and not exists (
        select 1 from verifications ver
        where ver.user_id = u.id
          and ver.doc_type in ('certification', 'competition', 'background', 'application')
      )
  ) s;
  return v;
end;
$$;

create or replace function my_listing()
returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'is_companion', (select is_companion from users where id = auth.uid()),
    'eligibility', (
      select jsonb_build_object(
        'birthdate', birthdate,
        'attested', trainer_attested_at is not null,
        'eligible', is_trainer_eligible(id)
      )
      from users where id = auth.uid()
    ),
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
    'backgrounds', (
      select coalesce(
        jsonb_object_agg(v.slug, jsonb_build_object('status', v.status, 'label', v.label)),
        '{}'::jsonb
      )
      from (
        select distinct on (a.slug) a.slug, ver.status, ver.label
        from verifications ver
        join activities a on a.id = ver.activity_id
        where ver.user_id = auth.uid()
          and ver.doc_type = 'background'
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
    ),
    'application', (
      select jsonb_build_object('status', ver.status, 'notes', ver.notes)
      from verifications ver
      where ver.user_id = auth.uid() and ver.doc_type = 'application'
      order by ver.created_at desc
      limit 1
    )
  );
$$;

revoke all on function is_trainer_eligible(uuid) from public, anon, authenticated;
revoke all on function has_activity_proof(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function confirm_trainer_eligibility(date, boolean) from public, anon;
grant execute on function confirm_trainer_eligibility(date, boolean) to authenticated;
revoke all on function submit_verification(text, text, text, text) from public, anon;
grant execute on function submit_verification(text, text, text, text) to authenticated;
revoke all on function submit_trainer_application() from public, anon;
grant execute on function submit_trainer_application() to authenticated;
revoke all on function add_offering(text, tier_level, int, boolean, int) from public, anon;
grant execute on function add_offering(text, tier_level, int, boolean, int) to authenticated;
revoke all on function review_verification(uuid, text, text) from public, anon;
grant execute on function review_verification(uuid, text, text) to authenticated;
revoke all on function list_pending_verifications() from public, anon;
grant execute on function list_pending_verifications() to authenticated;
revoke all on function my_listing() from public, anon;
grant execute on function my_listing() to authenticated;
