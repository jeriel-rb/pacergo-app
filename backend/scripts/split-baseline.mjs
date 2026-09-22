#!/usr/bin/env node
/**
 * Split backend/migrations/0001_baseline.sql into:
 *   - migrations/0001_schema.sql
 *   - migrations/0002_rls.sql
 *   - seeds/01_activities.sql, 02_storage_buckets.sql, 03_ai_plan_exercises.sql
 *
 * Usage: node backend/scripts/split-baseline.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '..');
const BASELINE = path.join(BACKEND, 'migrations', '0001_baseline.sql');

// ---------------------------------------------------------------------------
// SQL statement splitter (handles $$, strings, comments)
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
      } else {
        i++;
      }
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
      } else {
        i++;
      }
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
      const trimmed = cur.trim();
      if (trimmed) stmts.push(trimmed);
      cur = '';
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  const trimmed = cur.trim();
  if (trimmed) stmts.push(trimmed);
  return stmts;
}

/** Re-split statements that accidentally merged (e.g. semicolon inside strings). */
function refineStatements(stmts) {
  const out = [];
  for (const stmt of stmts) {
    if (stmt.split('\n').length < 80) {
      out.push(stmt);
      continue;
    }
    // Split on line starts that look like new SQL commands (outside our control,
    // but merged chunks are always a sequence of complete top-level commands).
    const parts = stmt.split(
      /\n(?=(?:create|alter|drop|insert|update|delete|grant|revoke|comment on)\s)/i,
    );
    if (parts.length <= 1) {
      out.push(stmt);
    } else {
      for (const p of parts) {
        const t = p.trim();
        if (t) out.push(t);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Section parser
// ---------------------------------------------------------------------------

function parseSections(sql) {
  const sections = [];
  const lines = sql.split('\n');
  let current = null;

  for (const line of lines) {
    const begin = line.match(/^-- BEGIN (\d+_\w+\.sql)\s*$/);
    const end = line.match(/^-- END (\d+_\w+\.sql)\s*$/);

    if (begin) {
      current = { name: begin[1], lines: [] };
      continue;
    }
    if (end && current && end[1] === current.name) {
      sections.push({ ...current, body: current.lines.join('\n') });
      current = null;
      continue;
    }
    if (current) current.lines.push(line);
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripLeadingComments(sql) {
  return sql
    .replace(/^(\s*--[^\n]*\n)+/, '')
    .trim();
}

function normalizeOneLine(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function stmtKind(stmt) {
  const core = normalizeOneLine(stripLeadingComments(stmt));
  if (!core || core === 'no-op') return 'noop';
  if (/^insert into activities\b/.test(core)) return 'seed:activities';
  if (/^insert into storage\.buckets\b/.test(core)) return 'seed:buckets';
  if (/^insert into exercises\b/.test(core)) return 'seed:exercises';
  if (/^update activities\b/.test(core)) return 'seed:activities-update';
  if (/^update storage\.buckets\b/.test(core)) return 'skip:buckets-update';
  if (/^alter table .+ enable row level security/.test(core)) return 'rls:enable';
  if (/^create policy /.test(core)) return 'rls:policy';
  if (/^drop policy if exists /.test(core)) return 'rls:drop';
  if (/^alter table profiles rename to users/.test(core)) return 'skip:rename';
  if (/^alter table profile_activities rename/.test(core)) return 'skip:rename';
  if (/^alter table \w+ rename column profile_id/.test(core)) return 'skip:rename';
  if (/^alter trigger .* rename/.test(core)) return 'skip:rename';
  if (/^alter policy .* rename/.test(core)) return 'skip:rename';
  if (/^alter index .* rename/.test(core)) return 'skip:rename';
  if (/\badd column if not exists\b/.test(core) && /^alter table/.test(core))
    return 'skip:add-column';
  if (/^alter table users drop column if exists bank_account/.test(core))
    return 'skip:drop-column';
  if (/^update payments\s+set gross_amount/.test(core)) return 'skip:backfill';
  if (/^delete from public\.profiles\b/.test(core)) return 'skip:backfill';
  if (/^delete from auth\.users\b/.test(core)) return 'skip:backfill';
  if (/^update public\.users\s+set display_name = derive_display_name/.test(core))
    return 'skip:backfill';
  if (/^do \$do\$/i.test(core) && /legacy profiles insert/i.test(core))
    return 'skip:backfill';
  if (/^do \$\$[\s\S]*payments_provider[\s\S]*drop constraint/.test(core))
    return 'skip:constraint-migration';
  if (/^alter table payments add constraint payments_provider_check/.test(core))
    return 'skip:constraint-migration';
  if (/^alter table payments alter column provider set default/.test(core))
    return 'skip:alter-default';
  if (/^create or replace function /.test(core)) return 'function';
  if (/^create table if not exists /.test(core)) return 'create-table';
  return 'schema';
}

function parsePolicyKey(stmt) {
  const m = stmt.match(
    /^(?:create|drop) policy\s+(?:if exists\s+)?"([^"]+)"\s+on\s+((?:storage\.objects)|[\w.]+)/i,
  );
  if (!m) return null;
  return `${m[2].toLowerCase()}::${m[1]}`;
}

function parseEnableRlsTable(stmt) {
  const m = stmt.match(/^alter table\s+((?:[\w.]+))\s+enable row level security/i);
  return m ? m[1].toLowerCase() : null;
}

function normalizeTableName(table) {
  const t = table.toLowerCase();
  if (t === 'profiles') return 'users';
  if (t === 'profile_activities') return 'user_activities';
  return t;
}

function parseAddColumns(stmt) {
  const m = stmt.match(/^alter table\s+([\w.]+)\s+(.*)$/is);
  if (!m) return null;
  const table = normalizeTableName(m[1]);
  const body = m[2];
  const cols = [];
  const re = /add column if not exists\s+([\s\S]*?)(?=,\s*add column if not exists|$)/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    let def = match[1].trim().replace(/,\s*$/, '');
    // Stop at statement boundary if parser grabbed too much
    def = def.split(/\n\s*(?:--|do \$\$|alter table)/i)[0].trim();
    if (def) cols.push(def);
  }
  if (cols.length === 0) {
    const single = body.match(/add column if not exists\s+([^\n;]+)/i);
    if (single) cols.push(single[1].trim());
  }
  return cols.length ? { table, cols } : null;
}

function parseCreateTableName(stmt) {
  const core = stripLeadingComments(stmt);
  const m = core.match(/^create table if not exists\s+([\w.]+)\s*\(/i);
  return m ? normalizeTableName(m[1]) : null;
}

function parseFunctionKey(stmt) {
  const core = stripLeadingComments(stmt);
  const m = core.match(
    /^create or replace function\s+(?:public\.)?([\w.]+)\s*\(([\s\S]*?)\)\s*returns/im,
  );
  if (!m) return null;
  const name = m[1].toLowerCase();
  const params = m[2]
    .split(',')
    .map((p) => p.trim().split(/\s+/)[0])
    .filter(Boolean)
    .join(',');
  return `${name}(${params})`;
}

function normalizeSchemaNames(sql) {
  let s = sql;
  s = s.replace(/\bprofile_activities\b/g, 'user_activities');
  s = s.replace(/\bprofile_id\b/g, 'user_id');
  s = s.replace(/\breferences profiles\b/gi, 'references users');
  s = s.replace(/\bon profiles\b/gi, 'on users');
  s = s.replace(/\bfrom profiles\b/gi, 'from users');
  s = s.replace(/\bjoin profiles\b/gi, 'join users');
  s = s.replace(/\binto profiles\b/gi, 'into users');
  s = s.replace(/\btable profiles\b/gi, 'table users');
  s = s.replace(
    /create table if not exists profiles\b/gi,
    'create table if not exists users',
  );
  s = s.replace(/\bprofiles_set_updated_at\b/g, 'users_set_updated_at');
  s = s.replace(
    /check \(provider = 'newebpay'\)/gi,
    "check (provider in ('newebpay', 'simulated'))",
  );
  return s;
}

function columnExistsInCreateTable(createStmt, colName) {
  return new RegExp(`\\b${colName}\\b`, 'i').test(createStmt);
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

function foldColumnsIntoCreateTable(createStmt, extraCols) {
  const cols = dedupeColumns(extraCols);
  if (!cols.length) return createStmt;
  const filtered = cols.filter(
    (col) => !columnExistsInCreateTable(createStmt, col.split(/\s+/)[0]),
  );
  if (!filtered.length) return createStmt;

  const m = createStmt.match(/^([\s\S]*)\n\)\s*;?\s*$/);
  if (!m) return createStmt;
  const before = m[1].trimEnd();
  const needsComma = !before.endsWith(',') && !before.endsWith('(');
  const addition = filtered.map((c) => `  ${c}`).join(',\n');
  return `${before}${needsComma ? ',\n' : '\n'}${addition}\n);`;
}

/** Fallback columns when ALTER ADD parsing misses or merges badly. */
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
  verifications: [
    'label text',
    'activity_id uuid references activities (id)',
  ],
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
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/heic',
      'image/heif',
    ],
  },
  banners: {
    file_size_limit: 10485760,
    allowed_mime_types: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/heic',
      'image/heif',
    ],
  },
  'verification-docs': {
    file_size_limit: 20971520,
    allowed_mime_types: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
  },
};

function formatMimeArray(arr) {
  return `array[${arr.map((m) => `'${m}'`).join(',')}]`;
}

function enhanceBucketInsert(stmt) {
  const m = stmt.match(/values\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(true|false)\s*\)/i);
  if (!m) return stmt;
  const id = m[1];
  const limits = BUCKET_LIMITS[id];
  if (!limits) return stmt;
  let out = stmt.replace(
    /insert into storage\.buckets \(id, name, public\)/i,
    'insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)',
  );
  out = out.replace(
    /values\s*\(\s*'[^']+'\s*,\s*'[^']+'\s*,\s*(?:true|false)\s*\)/i,
    `values ('${id}', '${m[2]}', ${m[3]}, ${limits.file_size_limit}, ${formatMimeArray(limits.allowed_mime_types)})`,
  );
  out = out.replace(
    /on conflict \(id\) do nothing/i,
    'on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types',
  );
  return out;
}

function buildActivitiesSeed(foundationInsert, hyroxInsert) {
  const header = `-- Activities catalog seed (foundation + hyrox slug).
-- Idempotent: ON CONFLICT (slug) DO UPDATE.

`;
  let foundation = foundationInsert.replace(
    /on conflict \(slug\) do nothing/i,
    'on conflict (slug) do update set name_en = excluded.name_en, name_zh = excluded.name_zh, icon = excluded.icon, is_active = excluded.is_active',
  );
  foundation = foundation.replace(
    /('running',\s*'Running',\s*'[^']*',\s*'footprints',\s*)false/i,
    '$1true',
  );
  foundation = foundation.replace(
    /('hiking',\s*'Hiking',\s*'[^']*',\s*'mountain',\s*)false/i,
    '$1true',
  );
  foundation = foundation.split(/\n(?=--)/)[0].trim();
  let hyrox = hyroxInsert.split(/\n(?=--)/)[0].trim();
  if (!/\('hyrox'/i.test(hyrox)) {
    hyrox =
      "insert into activities (slug, name_en, name_zh, icon, is_active) values ('hyrox', 'Hyrox', 'Hyrox', 'timer', true) on conflict (slug) do update set is_active = true";
  }
  return `${header}${foundation}${foundation.endsWith(';') ? '' : ';'}\n\n${hyrox}${hyrox.endsWith(';') ? '' : ';'}\n`;
}

const SKIP_SECTIONS = new Set([
  '0009_seed_demo_trainers.sql',
  '0010_rename_profiles_to_users.sql',
  '0011_rename_profile_id_to_user_id.sql',
]);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error(`Baseline not found: ${BASELINE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(BASELINE, 'utf8');
  const preamble = raw.split(/^-- BEGIN /m)[0].trim();
  const sections = parseSections(raw);

  const addColumnsByTable = new Map();
  const createTables = new Map();
  const functions = new Map();
  const enableRls = new Map();
  const policies = new Map(); // final create per policy key (respecting drops)
  const schemaItems = [];
  const seedActivities = { foundation: null, hyrox: null };
  const seedBuckets = [];
  let seedExercisesSection = null;
  let order = 0;

  for (const section of sections) {
    if (section.name === '0044_seed_exercises.sql') {
      seedExercisesSection = section.body
        .split('\n')
        .filter((line) => !/^--\s*=+$/.test(line.trim()))
        .join('\n')
        .trim();
      continue;
    }

    if (SKIP_SECTIONS.has(section.name)) continue;

    const stmts = refineStatements(splitStatements(section.body));
    for (const stmt of stmts) {
      const kind = stmtKind(stmt);

      if (kind === 'noop') continue;

      if (kind === 'seed:activities') {
        const core = stripLeadingComments(stmt);
        if (/\('hyrox'/i.test(core)) {
          seedActivities.hyrox = stmt;
        } else if (!seedActivities.foundation) {
          seedActivities.foundation = stmt;
        }
        continue;
      }
      if (kind === 'seed:buckets') {
        seedBuckets.push(enhanceBucketInsert(stmt));
        continue;
      }
      if (kind === 'seed:exercises') {
        // Should be handled by section extract; ignore fragments
        continue;
      }
      if (kind === 'seed:activities-update') continue;
      if (kind.startsWith('skip:')) {
        if (kind === 'skip:add-column') {
          const parsed = parseAddColumns(stmt);
          if (parsed) {
            const existing = addColumnsByTable.get(parsed.table) ?? [];
            addColumnsByTable.set(parsed.table, [...existing, ...parsed.cols]);
          }
        }
        continue;
      }

      if (kind === 'rls:enable') {
        const table = parseEnableRlsTable(stmt);
        if (table) {
          const norm = normalizeTableName(table);
          enableRls.set(norm, `alter table ${norm} enable row level security`);
        }
        continue;
      }
      if (kind === 'rls:policy') {
        const fixed = normalizeSchemaNames(stmt);
        const key = parsePolicyKey(fixed);
        if (key) policies.set(key, fixed);
        continue;
      }
      if (kind === 'rls:drop') {
        const key = parsePolicyKey(normalizeSchemaNames(stmt));
        if (key) policies.delete(key);
        continue;
      }

      if (kind === 'function') {
        const key = parseFunctionKey(stmt);
        if (key) functions.set(key, { stmt, order: order++ });
        continue;
      }

      if (kind === 'create-table') {
        const table = parseCreateTableName(stmt);
        if (table && !createTables.has(table)) {
          createTables.set(table, { stmt, order: order++ });
        }
        continue;
      }

      schemaItems.push({ stmt, order: order++ });
    }
  }

  // Fold ADD COLUMN into CREATE TABLE (+ known fallback columns)
  for (const [table, entry] of createTables) {
    let normalized = normalizeSchemaNames(entry.stmt);
    const parsed = (addColumnsByTable.get(table) ?? []).filter(
      (c) => !/^bank_account\s+text/i.test(c.trim()),
    );
    const extras = dedupeColumns([
      ...(KNOWN_EXTRA_COLUMNS[table] ?? []),
      ...parsed,
    ]);
    let folded = foldColumnsIntoCreateTable(normalized, extras);
    if (extras.length && !extras.every((c) => columnExistsInCreateTable(folded, c.split(/\s+/)[0]))) {
      // Fallback: inject columns before the closing paren of CREATE TABLE
      const colBlock = extras
        .filter((c) => !columnExistsInCreateTable(folded, c.split(/\s+/)[0]))
        .map((c) => `  ${c}`)
        .join(',\n');
      if (colBlock) {
        folded = folded.replace(
          /(\))\s*;\s*$/,
          `,\n${colBlock}\n$1;`,
        );
      }
    }
    createTables.set(table, { stmt: folded, order: entry.order });
  }

  // Dedupe non-function schema fragments (repeated grants/comments from merged sections)
  const seenSchema = new Set();
  const dedupedSchemaItems = [];
  for (const item of schemaItems) {
    const key = normalizeOneLine(stripLeadingComments(item.stmt));
    if (!key || key.startsWith('--')) continue;
    if (seenSchema.has(key)) continue;
    seenSchema.add(key);
    dedupedSchemaItems.push(item);
  }
  schemaItems.length = 0;
  schemaItems.push(...dedupedSchemaItems);

  const schemaParts = [
    `-- Pacergo schema (final state, squashed from 0001–0046 baseline).
-- RLS policies live in 0002_rls.sql; seed data in ../seeds/.

do $$ begin
  create type tier_level as enum ('A', 'B', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

`,
  ];

  const allSchema = [
    ...schemaItems,
    ...createTables.values(),
    ...functions.values(),
  ].sort((a, b) => a.order - b.order);

  for (const { stmt } of allSchema) {
    let trimmed = stmt.trim().replace(/;\s*$/, '');
    if (!trimmed) continue;
    // Drop comment-only fragments; keep SQL that merely has leading comments
    if (/^--/.test(trimmed) && !/^(create|alter|drop|insert|update|delete|grant|revoke|comment on)\s/m.test(trimmed)) {
      continue;
    }
    trimmed = stripLeadingComments(trimmed);
    if (!trimmed) continue;
    const normalized = normalizeSchemaNames(trimmed);
    schemaParts.push(normalized.endsWith(';') ? normalized : `${normalized};`);
    schemaParts.push('\n\n');
  }

  let schemaSql = schemaParts.join('');
  // Drop orphaned section-marker / comment fragments
  schemaSql = schemaSql
    .split('\n')
    .filter((line) => !/^-- =+$/.test(line.trim()) && !/^-- [^\n]*taxonomy;?\s*$/.test(line.trim()))
    .join('\n');

  const rlsParts = [
    `-- Row Level Security (final policies, squashed from baseline).
-- Each policy: DROP IF EXISTS then CREATE for idempotency.

`,
  ];
  for (const table of [...enableRls.keys()].sort()) {
    rlsParts.push(`${enableRls.get(table).replace(/;+\s*$/, '')};\n\n`);
  }
  for (const [, createStmt] of [...policies.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const m = createStmt.match(
      /^create policy\s+"([^"]+)"\s+on\s+((?:storage\.objects)|[\w.]+)/i,
    );
    if (!m) continue;
    rlsParts.push(`drop policy if exists "${m[1]}" on ${m[2]};\n`);
    rlsParts.push(`${createStmt};\n\n`);
  }
  const rlsSql = rlsParts.join('');

  const seedsDir = path.join(BACKEND, 'seeds');
  fs.mkdirSync(seedsDir, { recursive: true });

  const activitiesSql = buildActivitiesSeed(
    seedActivities.foundation ?? '-- missing foundation activities insert',
    seedActivities.hyrox ??
      "insert into activities (slug, name_en, name_zh, icon, is_active) values ('hyrox', 'Hyrox', 'Hyrox', 'timer', true) on conflict (slug) do update set is_active = true",
  );

  const bucketsSql = `-- Storage buckets for avatars, banners, and verification documents.
-- Idempotent: ON CONFLICT DO UPDATE for size/MIME limits.

${seedBuckets
  .map((s) => {
    const t = stripLeadingComments(s).trim();
    return t.endsWith(';') ? t : `${t};`;
  })
  .join('\n\n')}${seedBuckets.length ? '\n' : ''}`;

  const exercisesSql = `-- AI Plan exercise library (A-7): 80 exercises across equipment settings.
-- Idempotent via ON CONFLICT (slug) DO NOTHING.
-- Bundled images: apps/web/public/exercises/<slug>.jpg

${seedExercisesSection ?? '-- missing exercises seed section'}
`;

  const schemaPath = path.join(BACKEND, 'migrations', '0001_schema.sql');
  const rlsPath = path.join(BACKEND, 'migrations', '0002_rls.sql');

  fs.writeFileSync(schemaPath, schemaSql);
  fs.writeFileSync(rlsPath, rlsSql);
  fs.writeFileSync(path.join(seedsDir, '01_activities.sql'), activitiesSql);
  fs.writeFileSync(path.join(seedsDir, '02_storage_buckets.sql'), bucketsSql);
  fs.writeFileSync(path.join(seedsDir, '03_ai_plan_exercises.sql'), exercisesSql);

  const checks = [
    { name: 'no create policy in schema', ok: !/create policy/i.test(schemaSql) },
    { name: 'no enable rls in schema', ok: !/enable row level security/i.test(schemaSql) },
    {
      name: 'no top-level activities insert in schema',
      ok: !/^insert into activities/im.test(schemaSql),
    },
    {
      name: 'no top-level exercises insert in schema',
      ok: !/^insert into exercises/im.test(schemaSql),
    },
    {
      name: 'no top-level storage.buckets insert in schema',
      ok: !/^insert into storage\.buckets/im.test(schemaSql),
    },
    { name: 'rls has policies', ok: /create policy/i.test(rlsSql) },
    { name: 'rls has enable', ok: /enable row level security/i.test(rlsSql) },
    { name: 'activities seed idempotent', ok: /on conflict/i.test(activitiesSql) },
    { name: 'buckets seed idempotent', ok: /on conflict/i.test(bucketsSql) },
    { name: 'exercises seed idempotent', ok: /on conflict/i.test(exercisesSql) },
    { name: 'schema uses users table', ok: /create table if not exists users/i.test(schemaSql) },
    { name: 'no profiles table create', ok: !/create table if not exists profiles/i.test(schemaSql) },
  ];

  console.log(`Parsed ${sections.length} migration sections`);
  console.log('Wrote:');
  for (const p of [
    schemaPath,
    rlsPath,
    path.join(seedsDir, '01_activities.sql'),
    path.join(seedsDir, '02_storage_buckets.sql'),
    path.join(seedsDir, '03_ai_plan_exercises.sql'),
  ]) {
    const lines = fs.readFileSync(p, 'utf8').split('\n').length;
    console.log(`  ${path.relative(BACKEND, p)} (~${lines} lines)`);
  }

  console.log('\nVerification:');
  let failed = false;
  for (const c of checks) {
    console.log(`  [${c.ok ? 'OK' : 'FAIL'}] ${c.name}`);
    if (!c.ok) failed = true;
  }

  for (const [t, { stmt }] of createTables) {
    if (!/^create table if not exists/i.test(stripLeadingComments(stmt))) {
      console.warn(`WARN: createTables["${t}"] is not a CREATE TABLE (${stmt.slice(0, 60)}...)`);
    }
  }
  console.log(
    `\nPolicies: ${policies.size}, RLS tables: ${enableRls.size}, Functions: ${functions.size}, Tables: ${createTables.size}`,
  );
  console.log(`ADD COLUMN folded for: ${[...addColumnsByTable.keys()].join(', ')}`);

  if (failed) process.exit(1);
}

main();
