-- Drop shortcut columns that nothing reads. Goal is about_you->>'goal'.
-- Gym type is gym_equipment->>'gymType'. Safe on a database that already
-- applied 0001 with those columns, and a no-op where 0001 never created them.

drop function if exists public.save_onboarding_answers(text, text, jsonb, jsonb, jsonb, jsonb, text);

alter table public.user_onboarding drop column if exists gym_type;
alter table public.user_onboarding drop column if exists goal;

create or replace function save_onboarding_answers(
  p_about_you jsonb,
  p_training_preferences jsonb,
  p_gym_equipment jsonb,
  p_nutrition jsonb default null,
  p_nutrition_status text default null
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_updated_at timestamptz;
  v_gender text := p_about_you ->> 'gender';
  v_experience text := p_training_preferences ->> 'experience';
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_nutrition is not null and jsonb_typeof(p_nutrition) <> 'object' then
    raise exception 'invalid nutrition';
  end if;
  if p_nutrition_status is not null and p_nutrition_status not in ('built', 'skipped') then
    raise exception 'invalid nutrition status';
  end if;
  perform validate_fitness_profile(p_about_you, p_training_preferences, p_gym_equipment, p_nutrition);

  insert into user_onboarding (
    user_id, about_you, training_preferences, gym_equipment,
    nutrition, nutrition_status
  )
  values (
    auth.uid(), coalesce(p_about_you, '{}'::jsonb),
    coalesce(p_training_preferences, '{}'::jsonb), coalesce(p_gym_equipment, '{}'::jsonb),
    case when p_nutrition_status = 'built' then p_nutrition end,
    p_nutrition_status
  )
  on conflict (user_id) do update set
    about_you = jsonb_strip_nulls(
      jsonb_build_object('primaryActivity', user_onboarding.about_you -> 'primaryActivity')
    ) || excluded.about_you,
    training_preferences = excluded.training_preferences,
    gym_equipment = excluded.gym_equipment,
    nutrition_status = coalesce(p_nutrition_status, user_onboarding.nutrition_status),
    nutrition = case
      when coalesce(p_nutrition_status, user_onboarding.nutrition_status) = 'built' then p_nutrition
      else user_onboarding.nutrition
    end
  returning updated_at into v_updated_at;

  if v_gender in ('male', 'female') then
    update users set gender = v_gender
    where id = auth.uid() and (gender is null or gender in ('male', 'female'))
      and gender is distinct from v_gender;
  end if;

  if v_experience in ('no_experience', 'beginner', 'intermediate', 'advanced') then
    update users set
      experience_level = (case v_experience when 'no_experience' then 'beginner' else v_experience end)::experience_level
    where id = auth.uid()
      and experience_level is distinct from
        (case v_experience when 'no_experience' then 'beginner' else v_experience end)::experience_level;
  end if;

  return v_updated_at;
end $$;


revoke all on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function save_onboarding_answers(jsonb, jsonb, jsonb, jsonb, text) to authenticated;

create or replace function admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u record;
  v_trainer jsonb := null;
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  select us.*,
         au.email as auth_email,
         au.email_confirmed_at,
         au.last_sign_in_at,
         o.about_you as ob_about_you,
         o.training_preferences as ob_training_preferences
    into u
  from users us
  join auth.users au on au.id = us.id
  left join user_onboarding o on o.user_id = us.id
  where us.id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;

  if u.is_companion then
    v_trainer := jsonb_build_object(
      'listing', (
        select jsonb_build_object(
          'headline', cl.headline,
          'served_area', cl.served_area,
          'status', cl.status,
          'rating_avg', cl.rating_avg,
          'rating_count', cl.rating_count,
          'offerings', coalesce((
            select jsonb_agg(jsonb_build_object(
              'activity', a.slug,
              'tier', lo.tier::text,
              'price_ntd', lo.price_ntd,
              'is_free', lo.is_free,
              'session_minutes', lo.session_minutes
            ) order by lo.created_at)
            from listing_offerings lo
            join activities a on a.id = lo.activity_id
            where lo.listing_id = cl.id
          ), '[]'::jsonb)
        )
        from companion_listings cl
        where cl.user_id = p_user_id
      ),
      'verifications', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', ver.id,
          'doc_type', ver.doc_type,
          'activity', a.slug,
          'label', ver.label,
          'status', ver.status,
          'created_at', ver.created_at,
          'reviewed_at', ver.reviewed_at
        ) order by ver.created_at desc)
        from verifications ver
        left join activities a on a.id = ver.activity_id
        where ver.user_id = p_user_id
      ), '[]'::jsonb),
      'money', jsonb_build_object(
        'available_balance', trainer_available_balance(p_user_id),
        'open_withdrawals_count', (
          select count(*) from withdrawal_requests w
          where w.trainer_id = p_user_id and w.status in ('requested', 'processing')
        ),
        'open_withdrawals_sum', coalesce((
          select sum(w.amount) from withdrawal_requests w
          where w.trainer_id = p_user_id and w.status in ('requested', 'processing')
        ), 0),
        'total_paid_out', coalesce((
          select sum(w.amount) from withdrawal_requests w
          where w.trainer_id = p_user_id and w.status = 'paid'
        ), 0),
        'completed_orders', (
          select count(*) from bookings b
          where b.companion_id = p_user_id and b.status = 'completed'
        ),
        'bank_code', u.bank_code,
        'bank_name', u.bank_name,
        'branch_name', u.branch_name,
        'bank_account_holder', u.bank_account_holder,
        'bank_account_mask', u.bank_account_mask,
        'has_bank_account', u.bank_account_number is not null
      )
    );
  end if;

  return jsonb_build_object(
    'id', u.id,
    'display_name', u.display_name,
    'photo_url', u.photo_url,
    'email', u.auth_email,
    'email_confirmed', u.email_confirmed_at is not null,
    'is_admin', u.is_admin,
    'is_companion', u.is_companion,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'last_sign_in_at', u.last_sign_in_at,
    'profile', jsonb_build_object(
      'bio', u.bio,
      'gender', u.gender,
      'age', case when u.birthdate is null then null
                  else date_part('year', age(u.birthdate))::int end,
      'home_area', u.home_area,
      'locale', u.locale,
      'experience_level', u.experience_level::text,
      'weekly_target', u.weekly_target
    ),
    'setup', jsonb_build_object(
      'profile_setup_status', u.profile_setup_status,
      'onboarding_completed', u.onboarding_completed
    ),
    'fitness', jsonb_build_object(
      'primary_activity', u.ob_about_you ->> 'primaryActivity',
      'goal', u.ob_about_you ->> 'goal',
      'experience', u.ob_training_preferences ->> 'experience'
    ),
    'activity', jsonb_build_object(
      'bookings_made', (select count(*) from bookings b where b.seeker_id = p_user_id),
      'bookings_received', (select count(*) from bookings b where b.companion_id = p_user_id),
      'reviews_given', (select count(*) from reviews r where r.reviewer_id = p_user_id),
      'saved_trainers', (select count(*) from saved_companions s where s.seeker_id = p_user_id)
    ),
    'safety', jsonb_build_object(
      'blocked_by_me', (select count(*) from blocks b where b.blocker_id = p_user_id),
      'blocked_me', (select count(*) from blocks b where b.blocked_id = p_user_id),
      'reports_filed', (select count(*) from reports r where r.reporter_id = p_user_id),
      'reports_received', (select count(*) from reports r where r.reported_id = p_user_id),
      'consents', coalesce((
        select jsonb_agg(jsonb_build_object(
          'document', c.document_slug::text,
          'version', c.version_label,
          'accepted_at', c.accepted_at
        ) order by c.accepted_at desc)
        from consent_records c
        where c.user_id = p_user_id
      ), '[]'::jsonb)
    ),
    'trainer', v_trainer
  );
end $$;

revoke all on function admin_user_detail(uuid) from public, anon;
grant execute on function admin_user_detail(uuid) to authenticated;
