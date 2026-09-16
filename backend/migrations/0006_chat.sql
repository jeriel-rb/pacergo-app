-- 1:1 conversation between a sorted pair of participants.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references profiles (id) on delete cascade,
  participant_b uuid not null references profiles (id) on delete cascade,
  a_name text,
  a_photo text,
  b_name text,
  b_photo text,
  booking_id uuid references bookings (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);
create index if not exists conversations_a_idx on conversations (participant_a);
create index if not exists conversations_b_idx on conversations (participant_b);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "conversations participant read" on conversations;
create policy "conversations participant read" on conversations for select to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "conversations participant insert" on conversations;
create policy "conversations participant insert" on conversations for insert to authenticated
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "conversations participant update" on conversations;
create policy "conversations participant update" on conversations for update to authenticated
  using (auth.uid() = participant_a or auth.uid() = participant_b)
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

drop policy if exists "messages participant read" on messages;
create policy "messages participant read" on messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

drop policy if exists "messages sender insert" on messages;
create policy "messages sender insert" on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Bump last_message_at when a message lands (definer so the sender needn't
-- hold an explicit conversations UPDATE grant beyond participation).
create or replace function bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_bump_conversation on messages;
create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation();

-- Realtime stream for messages.
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;
