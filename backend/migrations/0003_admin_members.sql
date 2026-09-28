-- Admin: members list + promote-to-admin. Lets a platform admin see every
-- user's role (member / trainer / admin) and grant/revoke admin.

-- ---------------------------------------------------------------------------
-- Admin: list users with role flags, paginated (default 20/page) so the
-- console stays fast as the user base grows. Admins sort first, then newest
-- first within each group, so the admin roster stays visible at a glance.
-- Optional p_search matches display name or email (case-insensitive,
-- substring). Returns the page plus the total row count (of the filtered
-- set) for the pager UI.
-- ---------------------------------------------------------------------------
-- Signature changed (added p_search) — drop the old 2-arg overload first so
-- `create or replace` below doesn't leave both overloads live (PostgREST
-- would then see an ambiguous list_all_users RPC).
drop function if exists list_all_users(int, int);

create or replace function list_all_users(
  p_limit int default 20,
  p_offset int default 0,
  p_search text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_users jsonb;
  v_total int;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;

  select count(*) into v_total
  from users u
  join auth.users au on au.id = u.id
  where v_search is null
     or u.display_name ilike '%' || v_search || '%'
     or au.email ilike '%' || v_search || '%';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'display_name', s.display_name,
    'photo_url', s.photo_url,
    'email', s.email,
    'is_companion', s.is_companion,
    'is_admin', s.is_admin,
    'created_at', s.created_at
  ) order by s.is_admin desc, s.created_at desc), '[]'::jsonb) into v_users
  from (
    select u.id, u.display_name, u.photo_url, au.email,
           u.is_companion, u.is_admin, u.created_at
    from users u
    join auth.users au on au.id = u.id
    where v_search is null
       or u.display_name ilike '%' || v_search || '%'
       or au.email ilike '%' || v_search || '%'
    order by u.is_admin desc, u.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) s;

  return jsonb_build_object('users', v_users, 'total', v_total);
end;
$$;
grant execute on function list_all_users(int, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: grant or revoke platform-admin on another user.
-- ---------------------------------------------------------------------------
create or replace function set_user_admin(
  p_user_id uuid,
  p_is_admin boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'forbidden'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot change your own admin status'; end if;
  update users set is_admin = p_is_admin where id = p_user_id;
end;
$$;
grant execute on function set_user_admin(uuid, boolean) to authenticated;
