do $$ begin
  create type booking_status as enum
    ('requested', 'accepted', 'declined', 'cancelled', 'completed', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references profiles (id) on delete cascade,
  companion_id uuid not null references profiles (id) on delete cascade,
  offering_id uuid references listing_offerings (id) on delete set null,
  activity_slug text,
  tier tier_level,
  status booking_status not null default 'requested',
  scheduled_start timestamptz,
  duration_min int not null default 60,
  location_name text,
  agreed_price int not null default 0,
  is_free boolean not null default false,
  seeker_note text,
  -- denormalized display (avoids cross-user profile reads under owner-only RLS)
  seeker_name text,
  seeker_photo text,
  companion_name text,
  companion_photo text,
  cancelled_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seeker_id <> companion_id)
);
create index if not exists bookings_seeker_idx on bookings (seeker_id);
create index if not exists bookings_companion_idx on bookings (companion_id);

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  reviewer_id uuid not null references profiles (id) on delete cascade,
  reviewee_id uuid not null references profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- RLS
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;

drop policy if exists "bookings parties read" on bookings;
create policy "bookings parties read"
  on bookings for select to authenticated
  using (seeker_id = auth.uid() or companion_id = auth.uid());

drop policy if exists "bookings seeker insert" on bookings;
create policy "bookings seeker insert"
  on bookings for insert to authenticated
  with check (seeker_id = auth.uid());

drop policy if exists "bookings parties update" on bookings;
create policy "bookings parties update"
  on bookings for update to authenticated
  using (seeker_id = auth.uid() or companion_id = auth.uid())
  with check (seeker_id = auth.uid() or companion_id = auth.uid());

drop policy if exists "reviews readable" on reviews;
create policy "reviews readable"
  on reviews for select to authenticated using (true);

drop policy if exists "reviews author insert" on reviews;
create policy "reviews author insert"
  on reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (b.seeker_id = auth.uid() or b.companion_id = auth.uid())
    )
  );

drop policy if exists "notifications owner read" on notifications;
create policy "notifications owner read"
  on notifications for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications owner update" on notifications;
create policy "notifications owner update"
  on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notify the relevant party on booking insert/status change.
create or replace function notify_booking_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  ntype text;
begin
  if (tg_op = 'INSERT') then
    recipient := new.companion_id; ntype := 'booking_requested';
  elsif (new.status is distinct from old.status) then
    ntype := 'booking_' || new.status;
    if new.status in ('accepted', 'declined') then
      recipient := new.seeker_id;
    elsif new.cancelled_by is not null then
      recipient := case when new.cancelled_by = new.seeker_id then new.companion_id else new.seeker_id end;
    else
      recipient := new.seeker_id;
    end if;
  else
    return new;
  end if;

  insert into notifications (user_id, type, payload)
  values (recipient, ntype, jsonb_build_object('booking_id', new.id, 'status', new.status));
  return new;
end $$;

drop trigger if exists bookings_notify on bookings;
create trigger bookings_notify
  after insert or update on bookings
  for each row execute function notify_booking_event();

-- Recompute listing rating when a review lands on the companion.
create or replace function recompute_listing_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update companion_listings l
  set rating_count = sub.cnt,
      rating_avg = round(sub.avg, 1)
  from (
    select reviewee_id, count(*) cnt, avg(rating)::numeric avg
    from reviews where reviewee_id = new.reviewee_id group by reviewee_id
  ) sub
  where l.profile_id = sub.reviewee_id;
  return new;
end $$;

drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert on reviews
  for each row execute function recompute_listing_rating();
