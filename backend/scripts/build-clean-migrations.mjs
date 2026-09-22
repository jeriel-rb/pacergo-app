#!/usr/bin/env node
/**
 * Build clean 0001_schema.sql + 0002_rls.sql + seeds from sequential migrations
 * (0001_foundation … 0046_update_training_plan).
 *
 * Usage: node backend/scripts/build-clean-migrations.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '..');
const MIGRATIONS = path.join(BACKEND, 'migrations');
const SEEDS = path.join(BACKEND, 'seeds');

const SKIP_SCHEMA_FILES = new Set([
  '0009_seed_demo_trainers.sql',
  '0010_rename_profiles_to_users.sql',
  '0011_rename_profile_id_to_user_id.sql',
  '0039_auth_profile_sync_cleanup.sql',
  '0044_seed_exercises.sql',
]);

const RLS_ONLY_SKIP = new Set([
  '0009_seed_demo_trainers.sql',
  '0044_seed_exercises.sql',
]);

const OUTPUT_MIGRATIONS = new Set(['0001_schema.sql', '0002_rls.sql']);

const TRIGGER_FN_NAMES = new Set([
  'set_updated_at',
  'handle_new_user',
  'bump_conversation',
  'recompute_listing_rating',
  'notify_booking_event',
  'mask_bank_account',
  'users_set_bank_account_mask',
]);

/** Policies dropped by 0030/0045 — never emit in final RLS. */
const DEAD_POLICY_KEYS = new Set([
  'users::users owner can update',
  'users::users owner can insert',
  'users::profiles owner can update',
  'users::profiles owner can insert',
  'user_activities::user_activities owner write',
  'user_activities::profile_activities owner write',
  'companion_listings::listings owner manage',
  'listing_offerings::offerings owner manage',
  'saved_companions::saved owner manage',
  'availability::availability owner insert',
  'availability::availability owner delete',
  'availability_blocks::blocks owner manage',
  'verifications::verifications owner insert',
  'bookings::bookings seeker insert',
  'reviews::reviews author insert',
  'notifications::notifications owner update',
  'conversations::conversations participant insert',
  'conversations::conversations participant update',
  'messages::messages sender insert',
  'blocks::blocks owner manage',
  'reports::reports reporter insert',
  'user_onboarding::user_onboarding owner can insert',
  'user_onboarding::user_onboarding owner can update',
  'user_training_plans::user_training_plans owner can insert',
  'user_training_plans::user_training_plans owner can delete',
]);

const KNOWN_EXTRA_COLUMNS = {
  users: [
    'onboarding_completed boolean not null default false',
    'weekly_target int not null default 5',
    'banner_url text',
    'is_admin boolean not null default false',
    'bank_account_mask text',
    'bank_code text',
    'bank_name text',
    'branch_name text',
    'bank_account_number text',
    'bank_account_holder text',
  ],
  verifications: ['label text', 'activity_id uuid references activities (id)'],
  payments: [
    'gross_amount int',
    'platform_fee_rate numeric(5,4) not null default 0.05',
    'platform_fee_amount int not null default 0',
    'processing_fee_rate numeric(5,4)',
    'processing_fee_amount int',
    'trainer_payable int',
    "refund_status payment_refund_status not null default 'none'",
    'service_completed_at timestamptz',
    'settlement_hold_until timestamptz',
    "settlement_eligibility_status settlement_eligibility_status not null default 'ineligible'",
    "settlement_status settlement_status not null default 'unsettled'",
    'settled_at timestamptz',
    'admin_hold boolean not null default false',
    'admin_hold_reason text',
    'admin_hold_by uuid references users (id) on delete set null',
    'admin_hold_at timestamptz',
  ],
};

const BUCKET_LIMITS = {
  avatars: {
    file_size_limit: 5242880,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/avif', 'image/heic', 'image/heif',
    ],
  },
  banners: {
    file_size_limit: 10485760,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/avif', 'image/heic', 'image/heif',
    ],
  },
  'verification-docs': {
    file_size_limit: 20971520,
    allowed_mime_types: [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'image/heic', 'image/heif',
    ],
  },
};

// ---------------------------------------------------------------------------
// SQL utilities
// ---------------------------------------------------------------------------

function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let i = 0;
  let state = 'normal';
  let dollarTag = null;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (state === 'line_comment') {
      cur += ch;
      if (ch === '\n') state = 'normal';
      i++;
      continue;
    }
    if (state === 'block_comment') {
      cur += ch;
      if (ch === '*' && next === '/') {
        cur += next;
        i += 2;
        state = 'normal';
      } else i++;
      continue;
    }
    if (state === 'single_quote') {
      cur += ch;
      if (ch === "'" && next === "'") {
        cur += next;
        i += 2;
      } else if (ch === "'") {
        i++;
        state = 'normal';
      } else i++;
      continue;
    }
    if (state === 'dollar') {
      cur += ch;
      if (ch === '$') {
        const rest = sql.slice(i);
        const m = rest.match(/^(\$[a-zA-Z0-9_]*\$)/);
        if (m && m[1] === dollarTag) {
          cur += rest.slice(m[1].length - 1);
          i += m[1].length;
          dollarTag = null;
          state = 'normal';
          continue;
        }
      }
      i++;
      continue;
    }

    if (ch === '-' && next === '-') {
      cur += ch + next;
      i += 2;
      state = 'line_comment';
      continue;
    }
    if (ch === '/' && next === '*') {
      cur += ch + next;
      i += 2;
      state = 'block_comment';
      continue;
    }
    if (ch === "'") {
      cur += ch;
      i++;
      state = 'single_quote';
      continue;
    }
    if (ch === '$') {
      const rest = sql.slice(i);
      const m = rest.match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (m) {
        cur += m[1];
        i += m[1].length;
        dollarTag = m[1];
        state = 'dollar';
        continue;
      }
    }
    if (ch === ';') {
      const t = cur.trim();
      if (t) stmts.push(t);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  const t = cur.trim();
  if (t) stmts.push(t);
  return stmts;
}

function refineStatements(stmts) {
  const out = [];
  for (const stmt of stmts) {
    if (stmt.split('\n').length < 80) {
      out.push(stmt);
      continue;
    }
    const parts = stmt.split(
      /\n(?=(?:create|alter|drop|insert|update|delete|grant|revoke|comment on)\s)/i,
    );
    if (parts.length <= 1) out.push(stmt);
    else for (const p of parts) {
      const t = p.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function stripLeadingComments(sql) {
  return sql.replace(/^(\s*--[^\n]*\n)+/, '').trim();
}

function normalizeOneLine(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeTableName(table) {
  const t = table.toLowerCase();
  if (t === 'profiles') return 'users';
  if (t === 'profile_activities') return 'user_activities';
  return t;
}

function normalizeSchemaNames(sql) {
  return sql
    .replace(/\bprofile_activities\b/g, 'user_activities')
    .replace(/\bprofile_id\b/g, 'user_id')
    .replace(/\breferences profiles\b/gi, 'references users')
    .replace(/\bon profiles\b/gi, 'on users')
    .replace(/\bfrom profiles\b/gi, 'from users')
    .replace(/\bjoin profiles\b/gi, 'join users')
    .replace(/\binto profiles\b/gi, 'into users')
    .replace(/\btable profiles\b/gi, 'table users')
    .replace(/create table if not exists profiles\b/gi, 'create table if not exists users')
    .replace(/\bprofiles_set_updated_at\b/g, 'users_set_updated_at')
    .replace(/check \(provider = 'newebpay'\)/gi, "check (provider in ('newebpay', 'simulated'))");
}

function parseFunctionKey(stmt) {
  const core = stripLeadingComments(stmt);
  const m = core.match(
    /^create or replace function\s+(?:public\.)?([\w.]+)\s*\(([\s\S]*?)\)\s*returns/im,
  );
  if (!m) return null;
  const params = m[2].split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean).join(',');
  return `${m[1].toLowerCase()}(${params})`;
}

function parseFunctionName(stmt) {
  const core = stripLeadingComments(stmt);
  const m = core.match(/^create or replace function\s+(?:public\.)?([\w.]+)\s*\(/im);
  return m ? m[1].toLowerCase() : null;
}

function parseCreateTableName(stmt) {
  const m = stripLeadingComments(stmt).match(/^create table if not exists\s+([\w.]+)\s*\(/i);
  return m ? normalizeTableName(m[1]) : null;
}

function parseIndexKey(stmt) {
  const m = stmt.match(/create (?:unique )?index if not exists\s+([\w.]+)\s+on\s+([\w.]+)/i);
  return m ? `${normalizeTableName(m[2])}::${m[1].toLowerCase()}` : normalizeOneLine(stmt);
}

function parseTriggerKey(stmt) {
  const m = stmt.match(/^create trigger\s+([\w.]+)\s+[\s\S]*?\bon\s+([\w.]+)/i);
  return m ? `${normalizeTableName(m[2])}::${m[1].toLowerCase()}` : normalizeOneLine(stmt);
}

const POLICY_NAME_MAP = {
  'profiles owner can read': 'users owner can read',
  'profiles owner can update': 'users owner can update',
  'profiles owner can insert': 'users owner can insert',
  'profile_activities owner read': 'user_activities owner read',
  'profile_activities owner write': 'user_activities owner write',
};

function parsePolicyKey(stmt) {
  const m = stmt.match(
    /^(?:create|drop) policy\s+(?:if exists\s+)?"([^"]+)"\s+on\s+((?:storage\.objects)|[\w.]+)/i,
  );
  if (!m) return null;
  const table = normalizeTableName(m[2]);
  const name = POLICY_NAME_MAP[m[1]] ?? m[1];
  return `${table}::${name}`;
}

function policyKeysForDrop(stmt) {
  const m = stmt.match(
    /^drop policy\s+if exists\s+"([^"]+)"\s+on\s+((?:storage\.objects)|[\w.]+)/i,
  );
  if (!m) return [];
  const table = normalizeTableName(m[2]);
  const rawName = m[1];
  const mapped = POLICY_NAME_MAP[rawName] ?? rawName;
  const keys = new Set([
    `${table}::${rawName}`,
    `${table}::${mapped}`,
  ]);
  for (const [oldName, newName] of Object.entries(POLICY_NAME_MAP)) {
    if (newName === mapped || newName === rawName || oldName === rawName) {
      keys.add(`${table}::${oldName}`);
      keys.add(`${table}::${newName}`);
    }
  }
  return [...keys];
}

function parseEnableRlsTable(stmt) {
  const m = stmt.match(/^alter table\s+([\w.]+)\s+enable row level security/i);
  return m ? normalizeTableName(m[1]) : null;
}

function parseAddColumns(stmt) {
  const m = stmt.match(/^alter table\s+([\w.]+)\s+(.*)$/is);
  if (!m) return null;
  const table = normalizeTableName(m[1]);
  const body = m[2];
  const cols = [];
  const re = /add column(?: if not exists)?\s+([\s\S]*?)(?=,\s*add column|$)/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    let def = match[1].trim().replace(/,\s*$/, '');
    def = def.split(/\n\s*(?:--|do \$\$|alter table)/i)[0].trim();
    if (def) cols.push(def);
  }
  if (!cols.length) {
    const single = body.match(/add column(?: if not exists)?\s+([^\n;]+)/i);
    if (single) cols.push(single[1].trim());
  }
  return cols.length ? { table, cols } : null;
}

function dedupeColumns(cols) {
  const seen = new Set();
  const out = [];
  for (const col of cols) {
    const name = col.trim().split(/\s+/)[0];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(col.trim().replace(/;+\s*$/, ''));
    }
  }
  return out;
}

function columnExistsInCreateTable(createStmt, colName) {
  return new RegExp(`\\b${colName}\\b`, 'i').test(createStmt);
}

function foldColumnsIntoCreateTable(createStmt, extraCols) {
  const cols = dedupeColumns(extraCols).filter(
    (c) => !columnExistsInCreateTable(createStmt, c.split(/\s+/)[0]),
  );
  if (!cols.length) return createStmt;
  const colBlock = cols.map((c) => `  ${c}`).join(',\n');
  return createStmt.replace(/(\))\s*;\s*$/, `,\n${colBlock}\n$1;`);
}

function stmtKind(stmt) {
  const core = normalizeOneLine(stripLeadingComments(stmt));
  if (!core || core === 'no-op') return 'noop';
  if (/^insert into activities\b/.test(core)) return 'seed:activities';
  if (/^insert into storage\.buckets\b/.test(core)) return 'seed:buckets';
  if (/^insert into exercises\b/.test(core)) return 'seed:exercises';
  if (/^update activities\b/.test(core)) return 'skip';
  if (/^update storage\.buckets\b/.test(core)) return 'skip';
  if (/^alter table .+ enable row level security/.test(core)) return 'rls:enable';
  if (/^create policy /.test(core)) return 'rls:policy';
  if (/^drop policy if exists /.test(core)) return 'rls:drop';
  if (/^alter table profiles rename|^alter table profile_activities rename|^alter table \w+ rename column profile_id|^alter trigger .* rename|^alter policy .* rename|^alter index .* rename/.test(core))
    return 'skip';
  if (/^alter table users drop column if exists bank_account/.test(core)) return 'skip';
  if (/^delete from public\.profiles\b|^delete from auth\.users\b/.test(core)) return 'skip';
  if (/^update public\.users\s+set display_name = derive_display_name/.test(core)) return 'skip';
  if (/^update payments\s+set gross_amount/.test(core)) return 'skip';
  if (/^do \$\$/i.test(core) && /legacy profiles insert|payments_provider/.test(core)) return 'skip';
  if (/\badd column\b/.test(core) && /^alter table/.test(core)) return 'skip:add-column';
  if (/^alter table payments add constraint payments_provider_check/.test(core)) return 'skip';
  if (/^alter table payments alter column provider set default/.test(core)) return 'skip';
  if (/^select cron\.schedule/.test(core)) return 'other';
  if (/^create extension if not exists/.test(core)) return 'extension';
  if (/^create type |^do \$\$ begin\s+create type |^alter type .+ add value/.test(core)) return 'enum';
  if (/^create or replace function set_updated_at\s*\(/.test(core)) return 'fn:set_updated_at';
  if (/^create or replace function /.test(core)) return 'function';
  if (/^create table if not exists /.test(core)) return 'create-table';
  if (/^create (unique )?index if not exists/.test(core)) return 'index';
  if (/^create trigger /.test(core)) return 'trigger';
  if (/^drop trigger if exists /.test(core)) return 'drop-trigger';
  if (/^(grant|revoke)\s/.test(core)) return 'grant';
  if (/^alter default privileges/.test(core)) return 'grant';
  if (/^comment on /.test(core)) return 'comment';
  return 'other';
}

function loadMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => /^\d{4}_/.test(f) && !OUTPUT_MIGRATIONS.has(f))
    .sort((a, b) => parseInt(a.slice(0, 4), 10) - parseInt(b.slice(0, 4), 10));
}

function formatMimeArray(arr) {
  return `array[${arr.map((m) => `'${m}'`).join(',')}]`;
}

function buildActivitiesSeed() {
  return `-- Activities catalog: bookable activity taxonomy for discovery and AI plan goals.
-- Idempotent via ON CONFLICT (slug) DO UPDATE.

insert into activities (slug, name_en, name_zh, icon, is_active) values
  ('gym',        'Gym / Strength', '健身 / 重訓', 'dumbbell', true),
  ('running',    'Running',        '跑步',        'footprints', true),
  ('hiking',     'Hiking',         '登山健行',     'mountain', true),
  ('cycling',    'Cycling',        '騎車',        'bike', false),
  ('yoga',       'Yoga',           '瑜珈',        'flower', false),
  ('swimming',   'Swimming',       '游泳',        'waves', false),
  ('boxing',     'Boxing / Martial Arts', '拳擊 / 武術', 'shield', false),
  ('basketball', 'Basketball',     '籃球',        'circle', false),
  ('hyrox',      'Hyrox',          'Hyrox',       'timer', true)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  icon = excluded.icon,
  is_active = excluded.is_active;
`;
}

function buildBucketsSeed() {
  const rows = Object.entries(BUCKET_LIMITS).map(([id, lim]) => {
    const pub = id === 'verification-docs' ? 'false' : 'true';
    return `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('${id}', '${id}', ${pub}, ${lim.file_size_limit}, ${formatMimeArray(lim.allowed_mime_types)})
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;`;
  });
  return `-- Storage buckets: avatars, profile banners, and verification documents.
-- Idempotent via ON CONFLICT DO UPDATE (includes size/MIME limits from 0030).

${rows.join('\n\n')}
`;
}

function buildExercisesSeed() {
  const src = path.join(MIGRATIONS, '0044_seed_exercises.sql');
  let body = fs.readFileSync(src, 'utf8');
  body = body.replace(/^--[^\n]*\n/gm, (line) => {
    if (/^-- Exercise content library seed/.test(line)) return '';
    return line.startsWith('-- =') ? '' : line;
  });
  return `-- AI Plan exercise library (A-7): 80 exercises across equipment settings.
-- Idempotent via ON CONFLICT (slug) DO NOTHING.
-- Bundled images: apps/web/public/exercises/<slug>.jpg

${body.trim()}
`;
}

function processStatements(stmts, handlers) {
  for (const stmt of stmts) {
    const kind = stmtKind(stmt);
    const normalized = normalizeSchemaNames(stmt);
    handlers(kind, stmt, normalized);
  }
}

/** Dedupe repeated function bodies. Trigger helpers: keep first (pre-trigger). RPCs: keep last. */
function dedupeFunctionsByName(sql) {
  const matches = [...sql.matchAll(/create or replace function\s+(?:public\.)?([\w.]+)\s*\(/gi)];
  if (!matches.length) return sql;

  const byName = new Map();
  for (const m of matches) {
    const name = m[1].toLowerCase();
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(m.index);
  }

  const keepIndex = new Map();
  for (const [name, indices] of byName) {
    if (indices.length === 1) continue;
    keepIndex.set(
      name,
      TRIGGER_FN_NAMES.has(name) ? indices[0] : indices[indices.length - 1],
    );
  }
  if (!keepIndex.size) return sql;

  const spans = [];
  for (const m of matches) {
    const name = m[1].toLowerCase();
    const keep = keepIndex.get(name);
    if (keep === undefined || m.index === keep) continue;
    const end = sql.indexOf('$$;', m.index);
    if (end < 0) continue;
    let start = m.index;
    const prefix = sql.slice(Math.max(0, start - 800), start);
    const commentTail = prefix.match(/(\n--[^\n]*\n(?:--[^\n]*\n)*)\s*$/);
    if (commentTail) start -= commentTail[1].length;
    spans.push([start, end + 3]);
  }
  spans.sort((a, b) => b[0] - a[0]);
  let out = sql;
  for (const [start, end] of spans) out = out.slice(0, start) + out.slice(end);
  return out.replace(/\n{4,}/g, '\n\n\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const files = loadMigrationFiles();
  console.log(`Processing ${files.length} migration files…`);

  const addColumnsByTable = new Map();
  const createTables = new Map();
  const tableOrder = [];
  const extensions = [];
  const enums = [];
  const indexMap = new Map();
  const dropTriggerSet = new Set();
  const triggerMap = new Map();
  const functions = new Map();
  let setUpdatedAt = null;
  const grants = [];
  const comments = [];
  const otherSchema = [];
  const enableRls = new Set();
  const policies = new Map();

  const schemaHandler = (kind, stmt, normalized) => {
    if (kind.startsWith('rls:')) return;
    if (kind.startsWith('seed:') || kind === 'skip') {
      if (kind === 'skip:add-column') {
        const p = parseAddColumns(stmt);
        if (p) {
          const ex = addColumnsByTable.get(p.table) ?? [];
          addColumnsByTable.set(p.table, [...ex, ...p.cols.filter((c) => !/^bank_account\s+text/i.test(c))]);
        }
      }
      return;
    }
    if (kind === 'noop') return;
    if (kind === 'extension') { extensions.push(normalized); return; }
    if (kind === 'enum') { enums.push(normalized); return; }
    if (kind === 'fn:set_updated_at') { setUpdatedAt = normalized; return; }
    if (kind === 'function') {
      const key = parseFunctionKey(normalized);
      if (key) functions.set(key, normalized);
      return;
    }
    if (kind === 'create-table') {
      const table = parseCreateTableName(normalized);
      if (table && !createTables.has(table)) {
        tableOrder.push(table);
        createTables.set(table, normalized);
      }
      return;
    }
    if (kind === 'index') { indexMap.set(parseIndexKey(normalized), normalized); return; }
    if (kind === 'drop-trigger') { dropTriggerSet.add(normalized); return; }
    if (kind === 'trigger') { triggerMap.set(parseTriggerKey(normalized), normalized); return; }
    if (kind === 'grant') { grants.push(normalized); return; }
    if (kind === 'comment') { comments.push(normalized); return; }
    otherSchema.push(normalized);
  };

  const rlsHandler = (kind, stmt, normalized) => {
    if (kind === 'rls:enable') {
      const t = parseEnableRlsTable(stmt);
      if (t) enableRls.add(t);
      return;
    }
    if (kind === 'rls:policy') {
      const key = parsePolicyKey(normalized);
      if (key) policies.set(key, normalized);
      return;
    }
    if (kind === 'rls:drop') {
      for (const key of policyKeysForDrop(normalized)) policies.delete(key);
    }
  };

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
    const stmts = splitStatements(sql);

    if (!SKIP_SCHEMA_FILES.has(file)) {
      processStatements(refineStatements(stmts), schemaHandler);
    }
    if (!RLS_ONLY_SKIP.has(file)) {
      processStatements(stmts, rlsHandler);
    }
  }

  // Re-route leaked function / add-column fragments from otherSchema.
  const filteredOther = [];
  for (const stmt of otherSchema) {
    const normalized = normalizeSchemaNames(stmt);
    const core = normalizeOneLine(stripLeadingComments(normalized));
    if (/^create or replace function /.test(core)) {
      const key = parseFunctionKey(normalized);
      if (key) functions.set(key, normalized);
      continue;
    }
    if (/^alter table /.test(core) && /\badd column\b/.test(core)) {
      const p = parseAddColumns(normalized);
      if (p) {
        const ex = addColumnsByTable.get(p.table) ?? [];
        addColumnsByTable.set(p.table, [...ex, ...p.cols.filter((c) => !/^bank_account\s+text/i.test(c))]);
      }
      continue;
    }
    filteredOther.push(normalized);
  }
  otherSchema.length = 0;
  otherSchema.push(...filteredOther);

  for (const [table, stmt] of createTables) {
    const parsed = addColumnsByTable.get(table) ?? [];
    const extras = dedupeColumns([...(KNOWN_EXTRA_COLUMNS[table] ?? []), ...parsed]);
    createTables.set(table, foldColumnsIntoCreateTable(stmt, extras));
  }

  const bookingStatusEnum = `do $$ begin
  create type booking_status as enum (
    'requested', 'accepted', 'declined', 'cancelled', 'completed', 'expired',
    'pending_payment', 'payment_processing', 'payment_failed'
  );
exception when duplicate_object then null; end $$;`;

  const filteredEnums = enums.filter(
    (e) => !/create type booking_status/i.test(e) && !/alter type booking_status add value/i.test(e),
  );

  const triggerFns = new Map();
  const rpcFns = new Map();
  for (const [key, stmt] of functions) {
    const name = parseFunctionName(stmt);
    if (name && TRIGGER_FN_NAMES.has(name) && name !== 'set_updated_at') {
      triggerFns.set(key, stmt);
    } else if (key) {
      rpcFns.set(key, stmt);
    }
  }

  if (!setUpdatedAt) {
    setUpdatedAt = `create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;`;
  }

  const extSeen = new Set();
  const uniqueExtensions = extensions.filter((e) => {
    const k = normalizeOneLine(e);
    if (extSeen.has(k)) return false;
    extSeen.add(k);
    return true;
  });

  const parts = [
    `-- Pacergo schema (final state from migrations 0001–0046).
-- RLS: 0002_rls.sql | Seeds: ../seeds/

`,
  ];

  for (const e of uniqueExtensions) parts.push(`${e};\n\n`);
  parts.push(`${bookingStatusEnum}\n\n`);
  for (const e of filteredEnums) parts.push(`${e};\n\n`);
  parts.push(`${setUpdatedAt};\n\n`);

  for (const table of tableOrder) {
    parts.push(`${createTables.get(table)};\n\n`);
  }

  for (const idx of indexMap.values()) parts.push(`${idx};\n\n`);

  const preTriggerOrder = [
    'mask_bank_account',
    'users_set_bank_account_mask',
    'handle_new_user',
    'bump_conversation',
    'recompute_listing_rating',
    'notify_booking_event',
  ];
  const triggerByName = new Map();
  for (const [, stmt] of triggerFns) {
    const name = parseFunctionName(stmt);
    if (name) triggerByName.set(name, stmt);
  }
  const emittedTriggerNames = new Set();
  for (const name of preTriggerOrder) {
    const stmt = triggerByName.get(name);
    if (stmt && !emittedTriggerNames.has(name)) {
      parts.push(`${stmt};\n\n`);
      emittedTriggerNames.add(name);
    }
  }
  for (const [name, stmt] of triggerByName) {
    if (!emittedTriggerNames.has(name)) {
      parts.push(`${stmt};\n\n`);
      emittedTriggerNames.add(name);
    }
  }

  for (const dt of dropTriggerSet) parts.push(`${dt};\n\n`);
  for (const tr of triggerMap.values()) parts.push(`${tr};\n\n`);

  const rpcByName = new Map();
  for (const [, stmt] of rpcFns) {
    const name = parseFunctionName(stmt);
    if (name && !TRIGGER_FN_NAMES.has(name)) rpcByName.set(name, stmt);
  }
  for (const [, stmt] of rpcByName) parts.push(`${stmt};\n\n`);

  const grantSeen = new Set();
  for (const g of grants) {
    const k = normalizeOneLine(g);
    if (grantSeen.has(k)) continue;
    grantSeen.add(k);
    parts.push(`${g};\n\n`);
  }
  const commentSeen = new Set();
  for (const c of comments) {
    const k = normalizeOneLine(c);
    if (commentSeen.has(k)) continue;
    commentSeen.add(k);
    parts.push(`${c};\n\n`);
  }
  for (const o of otherSchema) {
    if (/create or replace function\s+/i.test(o)) continue;
    parts.push(`${o};\n\n`);
  }

  let schemaSql = dedupeFunctionsByName(
    parts.join('').replace(/;\n\n;/g, ';\n\n').replace(/;;+/g, ';'),
  );

  // Purge dead write policies from final RLS map.
  for (const key of DEAD_POLICY_KEYS) policies.delete(key);
  for (const key of [...policies.keys()]) {
    if (DEAD_POLICY_KEYS.has(key)) policies.delete(key);
  }

  const rlsParts = [
    `-- Row Level Security (final state after 0045/0046).
-- RPC-only writes: SELECT policies only (except storage object policies).
-- Each policy: DROP IF EXISTS then CREATE.

`,
  ];
  const rlsTables = [...enableRls].sort();
  for (const t of rlsTables) {
    rlsParts.push(`alter table ${t} enable row level security;\n\n`);
  }
  const policyEntries = [...policies.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, createStmt] of policyEntries) {
    const m = createStmt.match(/^create policy\s+"([^"]+)"\s+on\s+((?:storage\.objects)|[\w.]+)/i);
    if (!m) continue;
    rlsParts.push(`drop policy if exists "${m[1]}" on ${m[2]};\n`);
    rlsParts.push(`${createStmt};\n\n`);
  }
  const rlsSql = rlsParts.join('');

  fs.mkdirSync(SEEDS, { recursive: true });
  fs.writeFileSync(path.join(MIGRATIONS, '0001_schema.sql'), schemaSql, 'utf8');
  fs.writeFileSync(path.join(MIGRATIONS, '0002_rls.sql'), rlsSql, 'utf8');
  fs.writeFileSync(path.join(SEEDS, '01_activities.sql'), buildActivitiesSeed(), 'utf8');
  fs.writeFileSync(path.join(SEEDS, '02_storage_buckets.sql'), buildBucketsSeed(), 'utf8');
  fs.writeFileSync(path.join(SEEDS, '03_ai_plan_exercises.sql'), buildExercisesSeed(), 'utf8');

  const fnCount = rpcByName.size + triggerByName.size + (setUpdatedAt ? 1 : 0);
  const policyCount = (rlsSql.match(/create policy/gi) || []).length;

  const checks = [
    ['no create policy in schema', !/create policy/i.test(schemaSql)],
    ['no enable rls in schema', !/enable row level security/i.test(schemaSql)],
    ['no insert activities', !/^insert into activities/im.test(schemaSql)],
    ['no insert exercises', !/^insert into exercises/im.test(schemaSql)],
    ['no insert storage.buckets', !/^insert into storage\.buckets/im.test(schemaSql)],
    ['no add column', !/\badd column\b/i.test(schemaSql)],
    ['no profiles table', !/create table if not exists profiles/i.test(schemaSql)],
    ['one handle_new_user', (schemaSql.match(/create or replace function handle_new_user\s*\(/gi) || []).length === 1],
    ['one update_training_plan', (schemaSql.match(/create or replace function update_training_plan\s*\(/gi) || []).length === 1],
    ['rls has policies', /create policy/i.test(rlsSql)],
    ['no onboarding write policies', !/user_onboarding owner can (insert|update)/i.test(rlsSql)],
    ['no training_plans write policies', !/user_training_plans owner can (insert|delete)/i.test(rlsSql)],
    ['onboarding read policy', /user_onboarding owner can read/i.test(rlsSql)],
    ['training_plans read policy', /user_training_plans owner can read/i.test(rlsSql)],
    ['no listings owner manage', !/listings owner manage/i.test(rlsSql)],
    ['no profiles owner update', !/profiles owner can update/i.test(rlsSql)],
    ['no user_activities owner write', !/user_activities owner write/i.test(rlsSql)],
  ];

  console.log('\nWrote:');
  for (const p of [
    'migrations/0001_schema.sql',
    'migrations/0002_rls.sql',
    'seeds/01_activities.sql',
    'seeds/02_storage_buckets.sql',
    'seeds/03_ai_plan_exercises.sql',
  ]) {
    const lines = fs.readFileSync(path.join(BACKEND, p), 'utf8').split('\n').length;
    console.log(`  ${p} (~${lines} lines)`);
  }

  console.log(`\nFunctions (create or replace): ${fnCount}`);
  console.log(`Policies (create policy): ${policyCount}`);
  console.log(`RLS tables: ${rlsTables.length}`);

  console.log('\nValidation:');
  let failed = false;
  for (const [name, ok] of checks) {
    console.log(`  [${ok ? 'OK' : 'FAIL'}] ${name}`);
    if (!ok) failed = true;
  }

  const setUpdIdx = schemaSql.search(/create or replace function set_updated_at/i);
  const firstTrigIdx = schemaSql.search(/create trigger /i);
  const setBeforeTrig = setUpdIdx >= 0 && firstTrigIdx >= 0 && setUpdIdx < firstTrigIdx;
  console.log(`  [${setBeforeTrig ? 'OK' : 'FAIL'}] set_updated_at before triggers`);

  if (failed || !setBeforeTrig) {
    console.error('\nValidation failed — source migrations NOT deleted.');
    process.exit(1);
  }

  for (const f of fs.readdirSync(MIGRATIONS)) {
    if (/^\d{4}_/.test(f) && !OUTPUT_MIGRATIONS.has(f)) {
      fs.unlinkSync(path.join(MIGRATIONS, f));
    }
  }
  console.log('\nDeleted source numbered migrations (0001_foundation … 0046).');
}

main();
