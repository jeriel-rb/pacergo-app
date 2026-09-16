-- Phase 2 platform-wide requirement A-10 / §6.2: consent & legal pages
-- (Terms of Service, Privacy Policy, risk disclosure, partner conduct rules).
--
-- Re-read against the actual spec wording: "Client supplies all legal
-- wording. Dev implements pages, checkboxes, versioning, records only."
-- The client hands over finished text; nothing implies they need to self-edit
-- it through an admin UI. So the legal text itself is NOT stored here — it
-- lives as hardcoded i18n copy in the web app (apps/web/src/locales/*/legal.json),
-- exactly like every other page's copy in this codebase. "Versioning" just
-- means: each document has one hand-bumped version label (a date string) next
-- to its text, edited by a dev whenever the client sends updated wording.
--
-- The only thing that needs a database row is the CONSENT RECORD — proof that
-- a specific user agreed to a specific version at a specific time. That's
-- what this migration adds. (An earlier draft of this migration also modeled
-- the document text itself as a versioned table + read RPC — removed because
-- it solved a problem the spec doesn't ask for: nothing here has been pushed
-- to Supabase yet, so this file was rewritten in place rather than
-- superseded by a new migration number.)
--
-- Checkbox placement (decided 2026-09-15, see docs/phase2-work-tracker.md
-- Decisions log): one combined checkbox at sign-up for the 3 documents every
-- user needs (terms_of_service, privacy_policy, risk_disclosure), plus a
-- second, separate checkbox in the trainer studio flow for
-- partner_conduct_rules — that document only applies to trainers, and studio
-- is where a user becomes one.
--
-- Sign-up consent recording: NOT done via a client RPC call after signUp()
-- returns. This app requires email verification, so signUp() almost always
-- returns with no session yet (auth.uid() is null) — the session only
-- appears later, in a DIFFERENT browsing context (the user clicks the
-- verification link, typically in a new tab or even a different device via
-- their phone's mail app). A first attempt at this deferred the write via
-- sessionStorage + a flush-on-next-mount effect; that was wrong —
-- sessionStorage does not survive a link click into a new tab (no
-- window.opener relationship from an email client, so there's no "copy from
-- opener" exception either), so the flush would silently never fire for
-- most real users. Fixed by passing the consent choice through
-- `auth.signUp()`'s `options.data` (Supabase writes this to
-- `auth.users.raw_user_meta_data` synchronously, server-side, at signup —
-- no session or client round-trip required) and reading it back inside
-- `handle_new_user()` below, in the SAME transaction that creates the
-- `public.users` profile row. Works regardless of which device/tab/browser
-- the user later opens the verification link in.
--
-- Studio's partner_conduct_rules checkbox is different: the user already HAS
-- a session at that point (they're deep in an authenticated flow), so
-- accept_consent() below — a normal auth.uid()-gated RPC call — is correct
-- and sufficient there. No metadata trick needed for that one.

do $$ begin
  create type consent_document_slug as enum (
    'terms_of_service',
    'privacy_policy',
    'risk_disclosure',
    'partner_conduct_rules'
  );
exception when duplicate_object then null; end $$;

-- One row per (user, document, version) they've agreed to. `version_label` is
-- a free-form string matching whatever hand-bumped version the app showed at
-- accept time (e.g. "2026-09-15") — not a foreign key, because the document
-- text isn't a database entity; it's a point-in-time label for audit purposes.
create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  document_slug consent_document_slug not null,
  version_label text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, document_slug, version_label)
);

create index if not exists consent_records_user_idx
  on consent_records (user_id, document_slug);

alter table consent_records enable row level security;

-- A user can read their own consent history. No update/delete policy —
-- consent records are an append-only audit trail; corrections would be a new
-- row, not an edit. Inserts happen only through accept_consent() below (a
-- SECURITY DEFINER RPC), not a broad insert policy, so the server controls
-- `accepted_at`/`version_label` and a client can't backdate or forge them.
drop policy if exists "consent_records owner read" on consent_records;
create policy "consent_records owner read"
  on consent_records for select to authenticated
  using (user_id = auth.uid());

-- Records one accept. `p_version_label` comes from the client's
-- CONSENT_VERSIONS constant (apps/web/src/lib/consent.ts) — trusted because
-- worst case a stale/wrong label just mis-records *which* version text the
-- user saw, it can't grant access to anything, so this doesn't need a
-- server-side lookup table to validate against (there isn't one; see the
-- decision above on why the text itself isn't in the database).
create or replace function accept_consent(
  p_document_slug consent_document_slug,
  p_version_label text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into consent_records (user_id, document_slug, version_label)
  values (auth.uid(), p_document_slug, p_version_label)
  on conflict (user_id, document_slug, version_label) do nothing;
end $$;

grant execute on function accept_consent(consent_document_slug, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up consent: extend handle_new_user() (0001/0010/0030) to also write
-- consent_records from auth.signUp()'s options.data metadata. The web client
-- passes:
--   { consent_terms_of_service: "2026-09-15",
--     consent_privacy_policy: "2026-09-15",
--     consent_risk_disclosure: "2026-09-15" }
-- (the CONSENT_VERSIONS labels from apps/web/src/lib/consent.ts, only
-- included when the sign-up checkbox was checked — the client blocks
-- submission otherwise, so their presence here is the record of consent).
-- Re-declaring the full function (`create or replace` needs the whole body);
-- the only change from 0030's version is the loop at the end.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_key text;
  slug consent_document_slug;
begin
  insert into public.users (id, display_name, photo_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'User'
      ),
      80
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  -- Sign-up consent (see comment block above). Loop over the 3 documents so
  -- adding a 4th sign-up-time document later is a one-line change here, not
  -- three near-identical inserts.
  foreach slug in array array['terms_of_service', 'privacy_policy', 'risk_disclosure']::consent_document_slug[]
  loop
    meta_key := 'consent_' || slug::text;
    if new.raw_user_meta_data ? meta_key then
      insert into consent_records (user_id, document_slug, version_label)
      values (new.id, slug, new.raw_user_meta_data ->> meta_key)
      on conflict (user_id, document_slug, version_label) do nothing;
    end if;
  end loop;

  return new;
end $$;
