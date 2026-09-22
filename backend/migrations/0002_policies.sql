-- Pacergo RLS policies — centralized row-level security.
--
-- Runs after 0001_init (schema + functions). Seeds load after migrations.
-- Idempotent: ENABLE is safe to re-run; each policy is DROP IF EXISTS then CREATE.
--
-- Design rules (remember these):
--   * App tables are authenticated-read via SELECT policies only.
--     Writes go through SECURITY DEFINER RPCs (service_role / elevated),
--     not through INSERT/UPDATE/DELETE policies on the base tables.
--   * auth.uid() is wrapped in (select auth.uid()) so Postgres can treat it
--     as an initplan (evaluated once per statement, not per row).
--   * Tables with ENABLE RLS but NO policy below intentionally deny all
--     client access (service_role / definer RPCs only):
--       payment_status_events, reports,
--       withdrawal_settlements, withdrawal_status_events
--   * Storage is the exception: avatars/banners/verification-docs have
--     owner write policies so the client can upload under their own folder.

-- ============================================================================
-- PostGIS system table lock (local resets; no-ops on hosted)
-- ============================================================================
-- spatial_ref_sys is owned by supabase_admin on hosted projects;
-- revoke/enable may no-op there. Keep the attempt for local resets.

do $$
begin
  begin
    revoke insert, update, delete, truncate, references, trigger
      on table public.spatial_ref_sys from anon, authenticated;
  exception when insufficient_privilege or undefined_table then
    null;
  end;
  begin
    alter table public.spatial_ref_sys enable row level security;
  exception when insufficient_privilege or undefined_table then
    null;
  end;
end $$;

-- ============================================================================
-- Enable RLS on every public app table
-- ============================================================================

alter table activities enable row level security;
alter table availability enable row level security;
alter table availability_blocks enable row level security;
alter table blocks enable row level security;
alter table bookings enable row level security;
alter table companion_listings enable row level security;
alter table consent_records enable row level security;
alter table conversations enable row level security;
alter table exercises enable row level security;
alter table listing_offerings enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table payment_status_events enable row level security;
alter table payments enable row level security;
alter table reports enable row level security;
alter table reviews enable row level security;
alter table saved_companions enable row level security;
alter table user_activities enable row level security;
alter table user_onboarding enable row level security;
alter table user_training_plans enable row level security;
alter table users enable row level security;
alter table verifications enable row level security;
alter table withdrawal_requests enable row level security;
alter table withdrawal_settlements enable row level security;
alter table withdrawal_status_events enable row level security;

-- ============================================================================
-- Catalog / reference (any authenticated user may read)
-- ============================================================================

-- Activity catalog (Gym, Running, …) — shared reference data.
drop policy if exists "activities readable" on activities;
create policy "activities readable"
  on activities for select to authenticated using (true);

-- AI Plan exercise library — shared reference data (slug catalog).
drop policy if exists "exercises readable" on exercises;
create policy "exercises readable"
  on exercises for select to authenticated using (true);

-- Public reviews of companions/trainers.
drop policy if exists "reviews readable" on reviews;
create policy "reviews readable"
  on reviews for select to authenticated using (true);

-- Weekly availability windows are browseable for booking discovery.
drop policy if exists "availability readable" on availability;
create policy "availability readable"
  on availability for select to authenticated using (true);

-- ============================================================================
-- Profile & ownership (row must belong to the signed-in user)
-- ============================================================================

-- App profile (public.users) — owner-only; cross-user reads go through RPCs.
drop policy if exists "users owner can read" on users;
create policy "users owner can read"
  on users for select to authenticated using (id = (select auth.uid()));

-- User ↔ activity preferences.
drop policy if exists "user_activities owner read" on user_activities;
create policy "user_activities owner read"
  on user_activities for select to authenticated using (user_id = (select auth.uid()));

-- AI Plan onboarding answers (age, goal, excluded muscles, …).
drop policy if exists "user_onboarding owner can read" on user_onboarding;
create policy "user_onboarding owner can read"
  on user_onboarding for select to authenticated using (user_id = (select auth.uid()));

-- Saved AI training plans — owner-only.
drop policy if exists "user_training_plans owner can read" on user_training_plans;
create policy "user_training_plans owner can read"
  on user_training_plans for select to authenticated
  using ((select auth.uid()) = user_id);

-- Consent audit trail (ToS / privacy / risk) — owner-only.
drop policy if exists "consent_records owner read" on consent_records;
create policy "consent_records owner read"
  on consent_records for select to authenticated
  using (user_id = (select auth.uid()));

-- In-app notifications inbox.
drop policy if exists "notifications owner read" on notifications;
create policy "notifications owner read"
  on notifications for select to authenticated using (user_id = (select auth.uid()));

-- Saved / favorited companions — seeker-only.
drop policy if exists "saved owner read" on saved_companions;
create policy "saved owner read"
  on saved_companions for select to authenticated using (seeker_id = (select auth.uid()));

-- Block list — only the blocker can see who they blocked.
drop policy if exists "blocks owner read" on blocks;
create policy "blocks owner read"
  on blocks for select to authenticated using (blocker_id = (select auth.uid()));

-- One-off availability blocks (vacation, etc.) — owner-only.
drop policy if exists "availability_blocks owner read" on availability_blocks;
create policy "availability_blocks owner read"
  on availability_blocks for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Discovery / companion listings
-- ============================================================================

-- Active listings are public to authenticated users; owners also see drafts.
drop policy if exists "listings active readable" on companion_listings;
create policy "listings active readable"
  on companion_listings for select to authenticated
  using (status = 'active' or user_id = (select auth.uid()));

-- Offerings only when the parent listing is active (or you own it).
drop policy if exists "offerings readable for active listings" on listing_offerings;
create policy "offerings readable for active listings"
  on listing_offerings for select to authenticated
  using (
    exists (
      select 1 from companion_listings l
      where l.id = listing_id
        and (l.status = 'active' or l.user_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- Bookings, chat, payments
-- ============================================================================

-- Either party on the booking (seeker or companion) may read it.
drop policy if exists "bookings parties read" on bookings;
create policy "bookings parties read"
  on bookings for select to authenticated
  using (seeker_id = (select auth.uid()) or companion_id = (select auth.uid()));

-- Conversation inbox — only the two participants.
drop policy if exists "conversations participant read" on conversations;
create policy "conversations participant read"
  on conversations for select to authenticated
  using ((select auth.uid()) in (participant_a, participant_b));

-- Messages — only if you are a participant on the parent conversation.
drop policy if exists "messages participant read" on messages;
create policy "messages participant read"
  on messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.participant_a, c.participant_b)
    )
  );

-- Payer can read their own payment rows.
drop policy if exists "payments owner read" on payments;
create policy "payments owner read"
  on payments for select to authenticated
  using (user_id = (select auth.uid()));

-- Trainer (companion on the booking) can read payments for their sessions
-- (studio earnings / settlement views).
drop policy if exists "payments trainer read" on payments;
create policy "payments trainer read"
  on payments for select to authenticated
  using (exists (
    select 1 from bookings b
    where b.id = payments.booking_id and b.companion_id = (select auth.uid())
  ));

-- ============================================================================
-- Trust & safety / admin
-- ============================================================================

-- Verification submissions — owner can see own; platform admin can see all.
drop policy if exists "verifications owner read" on verifications;
create policy "verifications owner read"
  on verifications for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "verifications admin read" on verifications;
create policy "verifications admin read"
  on verifications for select to authenticated using ((select is_platform_admin()));

-- Trainer can read their own withdrawal requests (payouts).
drop policy if exists "withdrawal_requests trainer read" on withdrawal_requests;
create policy "withdrawal_requests trainer read"
  on withdrawal_requests for select to authenticated
  using (trainer_id = (select auth.uid()));

-- ============================================================================
-- Storage buckets (avatars, banners, verification-docs)
-- ============================================================================
-- Path convention: <bucket>/<auth.uid()>/...
-- Public read on avatars/banners; verification-docs stay private.

-- Avatars: anyone can read; owner writes under their uid folder.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Banners: same pattern as avatars.
drop policy if exists "banners public read" on storage.objects;
create policy "banners public read"
  on storage.objects for select
  using (bucket_id = 'banners');

drop policy if exists "banners owner insert" on storage.objects;
create policy "banners owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "banners owner update" on storage.objects;
create policy "banners owner update" on storage.objects for update to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "banners owner delete" on storage.objects;
create policy "banners owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Verification docs: private — owner + platform admin only (no public read).
drop policy if exists "verif docs owner read" on storage.objects;
create policy "verif docs owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "verif docs admin read" on storage.objects;
create policy "verif docs admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (select is_platform_admin()));

drop policy if exists "verif docs owner insert" on storage.objects;
create policy "verif docs owner insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
