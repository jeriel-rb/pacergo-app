-- Close two gaps in 0004's trainer approval (security review):
-- * Approving a certification for a non-trainer granted the trainer role and
--   activated the listing without the application's checks (other activities'
--   Tier C proof, the 18+ attestation). It now grants only when that same bar
--   is met.
-- * Application approval passed vacuously when the applicant had no plans,
--   and didn't re-check eligibility for applications submitted before 0004.

-- At least one plan, and every plan's activity has an approved proof.
create or replace function trainer_proofs_complete(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
      select 1 from listing_offerings o
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = p_user_id
    )
    and not exists (
      select 1 from listing_offerings o
      join companion_listings cl on cl.id = o.listing_id
      where cl.user_id = p_user_id
        and not has_activity_proof(p_user_id, o.activity_id, array['approved'])
    );
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
  -- A trainer application is only approvable for an eligible (18+, attested)
  -- applicant with at least one plan, every one of whose activities has an
  -- approved proof (background or certification).
  if p_status = 'approved' and exists (
    select 1 from verifications v where v.id = p_id and v.doc_type = 'application'
  ) then
    select * into v_ver from verifications where id = p_id;
    if not is_trainer_eligible(v_ver.user_id) then raise exception 'eligibility_missing'; end if;
    if not trainer_proofs_complete(v_ver.user_id) then raise exception 'proof_not_approved'; end if;
  end if;
  update verifications set
    status = p_status,
    notes = nullif(p_notes, ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_id
  returning * into v_ver;
  if not found then raise exception 'verification not found'; end if;

  -- Approving a first trainer application grants the trainer role. A
  -- certification only does so when the same bar as an application is met
  -- (eligible, and every offered activity's proof approved); otherwise the
  -- certification is recorded and the application still decides.
  if p_status = 'approved' and (
    v_ver.doc_type = 'application'
    or (v_ver.doc_type = 'certification'
        and is_trainer_eligible(v_ver.user_id)
        and trainer_proofs_complete(v_ver.user_id))
  ) then
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

revoke all on function trainer_proofs_complete(uuid) from public, anon, authenticated;
revoke all on function review_verification(uuid, text, text) from public, anon;
grant execute on function review_verification(uuid, text, text) to authenticated;
