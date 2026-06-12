-- Weekly recurring availability slots (minutes from midnight, local intent).
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute int not null check (end_minute between 1 and 1440),
  created_at timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index if not exists availability_profile_idx on availability (profile_id);

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  blocked_date date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, blocked_date)
);

-- Tier A verification documents (metadata; files live in the private bucket).
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  doc_type text not null check (doc_type in ('certification', 'id')),
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists verifications_profile_idx on verifications (profile_id);

-- RLS
alter table availability enable row level security;
alter table availability_blocks enable row level security;
alter table verifications enable row level security;

-- Availability is public (seekers see when a companion is free); owner writes.
drop policy if exists "availability readable" on availability;
create policy "availability readable" on availability for select to authenticated using (true);
drop policy if exists "availability owner insert" on availability;
create policy "availability owner insert" on availability for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists "availability owner delete" on availability;
create policy "availability owner delete" on availability for delete to authenticated
  using (profile_id = auth.uid());

drop policy if exists "blocks owner manage" on availability_blocks;
create policy "blocks owner manage" on availability_blocks for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Verifications: owner reads/inserts own; status changes are admin-only
-- (service role), so there is no UPDATE policy for authenticated.
drop policy if exists "verifications owner read" on verifications;
create policy "verifications owner read" on verifications for select to authenticated
  using (profile_id = auth.uid());
drop policy if exists "verifications owner insert" on verifications;
create policy "verifications owner insert" on verifications for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');

-- Storage: owner-only access to their own folder in verification-docs.
drop policy if exists "verif docs owner insert" on storage.objects;
create policy "verif docs owner insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "verif docs owner read" on storage.objects;
create policy "verif docs owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );
