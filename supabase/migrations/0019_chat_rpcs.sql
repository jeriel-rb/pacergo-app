-- Messaging via RPCs, gated on an existing booking between the two users
-- (下單之前不能打訊息 — no messaging before a booking exists).

-- Whether the caller has any booking with another user (gates the chat entry).
create or replace function has_booking_with(p_other_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from bookings
    where (seeker_id = auth.uid() and companion_id = p_other_id)
       or (seeker_id = p_other_id and companion_id = auth.uid())
  );
$$;

-- Open (or fetch) the conversation with another user. Requires a booking.
create or replace function start_conversation(p_other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
end;
$$;

-- The caller's conversations, newest activity first, with a preview + unread.
create or replace function my_conversations()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(c.obj order by c.last_message_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', cv.id,
      'other_id', case when cv.participant_a = auth.uid() then cv.participant_b else cv.participant_a end,
      'other_name', case when cv.participant_a = auth.uid() then cv.b_name else cv.a_name end,
      'other_photo', case when cv.participant_a = auth.uid() then cv.b_photo else cv.a_photo end,
      'last_message_at', cv.last_message_at,
      'last_body', (
        select m.body from messages m
        where m.conversation_id = cv.id order by m.created_at desc limit 1
      ),
      'unread', (
        select count(*) from messages m
        where m.conversation_id = cv.id and m.sender_id <> auth.uid() and m.read_at is null
      )
    ) as obj,
    cv.last_message_at
    from conversations cv
    where cv.participant_a = auth.uid() or cv.participant_b = auth.uid()
  ) c;
$$;

-- Header info (the other party) for a single conversation.
create or replace function conversation_header(p_conversation_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', cv.id,
    'other_id', case when cv.participant_a = auth.uid() then cv.participant_b else cv.participant_a end,
    'other_name', case when cv.participant_a = auth.uid() then cv.b_name else cv.a_name end,
    'other_photo', case when cv.participant_a = auth.uid() then cv.b_photo else cv.a_photo end
  )
  from conversations cv
  where cv.id = p_conversation_id
    and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid());
$$;

-- Messages in a conversation the caller participates in (oldest first).
create or replace function conversation_messages(p_conversation_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender_id', m.sender_id, 'body', m.body, 'created_at', m.created_at
  ) order by m.created_at asc), '[]'::jsonb)
  from messages m
  join conversations cv on cv.id = m.conversation_id
  where m.conversation_id = p_conversation_id
    and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid());
$$;

-- Send a message to a conversation the caller participates in.
create or replace function send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception 'empty message'; end if;
  if not exists (
    select 1 from conversations
    where id = p_conversation_id and (participant_a = v_uid or participant_b = v_uid)
  ) then
    raise exception 'not a participant';
  end if;

  insert into messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_uid, btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

-- Mark the other party's messages in a conversation as read.
create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null
    and exists (
      select 1 from conversations cv
      where cv.id = p_conversation_id
        and (cv.participant_a = auth.uid() or cv.participant_b = auth.uid())
    );
$$;

grant execute on function has_booking_with(uuid) to authenticated;
grant execute on function start_conversation(uuid) to authenticated;
grant execute on function my_conversations() to authenticated;
grant execute on function conversation_header(uuid) to authenticated;
grant execute on function conversation_messages(uuid) to authenticated;
grant execute on function send_message(uuid, text) to authenticated;
grant execute on function mark_conversation_read(uuid) to authenticated;
