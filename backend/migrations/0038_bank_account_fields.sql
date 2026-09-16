-- Phase 2 Stage 2c (docs/phase2-execution-order.md): replace the single
-- placeholder `users.bank_account` text column (0035) with structured Taiwan
-- bank-transfer fields, so Stage 3 (B-6/B-7/B-8) isn't blocked waiting on
-- client prerequisite P-6 (bank account field format). Best-guess shape,
-- standard for TW manual bank transfers; adjust column-by-column via a later
-- migration if P-6 specifies something different — not a redesign.
--
-- No data migration needed: `bank_account` was added in 0035 but never
-- written to by any app code (schema-only, confirmed via grep) or seeded, so
-- dropping it is safe.

alter table users
  drop column if exists bank_account;

alter table users
  add column if not exists bank_code text,             -- 3-digit TW bank code, e.g. '807'
  add column if not exists bank_name text,              -- e.g. '永豐商業銀行'
  add column if not exists branch_name text,            -- e.g. '天母分行'
  add column if not exists bank_account_number text,    -- raw; admin-detail-only, never logged
  add column if not exists bank_account_holder text;    -- must match the bank account name

-- `bank_account_mask` (0035) is kept as the masked, export/listing-safe copy,
-- but is now derived automatically from `bank_account_number` instead of
-- being written by hand — keeps the two columns from ever drifting apart.
-- Mirrors apps/web/src/lib/export/mask.ts::maskBankAccount exactly (keep last
-- 4 chars, mask the rest; <=4 chars masks entirely; null/empty -> null).
create or replace function mask_bank_account(p_value text)
returns text
language sql
immutable
as $$
  select case
    when p_value is null or trim(p_value) = '' then null
    when length(trim(p_value)) <= 4 then repeat('*', length(trim(p_value)))
    else repeat('*', length(trim(p_value)) - 4) || right(trim(p_value), 4)
  end;
$$;

create or replace function users_set_bank_account_mask()
returns trigger
language plpgsql
as $$
begin
  new.bank_account_mask := mask_bank_account(new.bank_account_number);
  return new;
end $$;

drop trigger if exists users_bank_account_mask on users;
create trigger users_bank_account_mask
  before insert or update of bank_account_number on users
  for each row execute function users_set_bank_account_mask();

comment on column users.bank_account_number is
  'Raw bank account number. Admin-detail-only (B-8); never appears in exports, listings, or logs. Format per P-6, best-guess default until client confirms.';
comment on column users.bank_account_mask is
  'Auto-derived from bank_account_number via users_bank_account_mask trigger. Safe for exports/listings (B-9, B-7).';
