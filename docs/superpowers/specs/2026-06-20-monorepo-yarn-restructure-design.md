# Monorepo Restructure (Yarn Workspaces) — Design

**Date:** 2026-06-20
**Status:** Approved, ready to implement
**Scope:** Structural only. No feature behavior changes. The 74 existing tests must stay green.

## Goal

Convert the repo from a single Expo React Native app at the root into a Yarn-workspaces
monorepo with shared/api packages and an `apps/` layout, without breaking the working v1.

## Decisions (locked)

- **Package manager:** Yarn 4 (Berry, latest stable) with `nodeLinker: node-modules`.
  Yarn 4's default PnP linker breaks Metro/React Native; the node-modules linker is
  fully compatible with Expo SDK 56 / RN 0.85. This is the newest Yarn line (Classic 1.x
  is maintenance-only).
- **Migration scope:** *Skeleton + move mobile.* Move the entire current app into
  `apps/mobile` untouched; create `packages/shared` and `packages/api` as **scaffolds only**
  (valid package, empty `src`). Real code extraction is deferred to a later, incremental pass.
- **Web apps:** `apps/web` and `apps/website` are **placeholders** (minimal `package.json`
  + README); not scaffolded with Next.js yet.
- **`supabase/config.toml`:** skipped for now (a wrong one is worse than none); add later
  via `supabase init`.

## Target structure

```
pacergo-app/
├── package.json              # NEW root: private, workspaces, packageManager: yarn@4
├── .yarnrc.yml               # NEW: nodeLinker: node-modules
├── yarn.lock                 # NEW (replaces package-lock.json)
├── tsconfig.base.json        # NEW: shared compiler options
├── .gitignore                # updated for monorepo + yarn
├── README.md                 # updated (yarn + monorepo layout)
├── docs/                     # unchanged (specs + plans)
│
├── supabase/
│   ├── migrations/           # 7 existing migrations, untouched
│   ├── functions/            # NEW empty dir (.gitkeep)
│   └── seed.sql              # NEW empty placeholder
│
├── packages/
│   ├── shared/               # SCAFFOLD ONLY  "@pacergo/shared"
│   │   ├── package.json
│   │   ├── tsconfig.json     # extends ../../tsconfig.base.json
│   │   └── src/
│   │       ├── index.ts      # empty re-export barrel
│   │       ├── enums/        (.gitkeep)
│   │       ├── types/        (.gitkeep)   # database.ts lands here later
│   │       ├── helpers/      (.gitkeep)
│   │       ├── constants/    (.gitkeep)
│   │       └── schemas/      (.gitkeep)
│   └── api/                  # SCAFFOLD ONLY  "@pacergo/api"
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── queries/      (.gitkeep)
│           └── mutations/    (.gitkeep)
│
└── apps/
    ├── mobile/               # the ENTIRE current app, moved via `git mv`
    │   ├── package.json      # current root package.json, name "pacergo", deps unchanged
    │   ├── app.json, babel.config.js, jest.config.js, jest.setup.js,
    │   │   tsconfig.json, tailwind.config.js, nativewind-env.d.ts, .env.example
    │   ├── metro.config.js   # ONLY edited file: monorepo watchFolders/nodeModulesPaths
    │   ├── .gitignore        # app-level ignores (.expo, etc.)
    │   ├── assets/  scripts/  src/
    ├── web/                  # PLACEHOLDER (package.json + README)
    └── website/              # PLACEHOLDER (package.json + README)
```

## Why the move keeps tests green

Every config that points at the app's code uses a **relative** path, so moving the files
into `apps/mobile/` (rootDir becomes `apps/mobile`) requires **no path edits**:

- `tsconfig.json`: `@/* → ./src/*`
- `jest.config.js`: `moduleNameMapper` `<rootDir>/src`, `setupFilesAfterEnv` `<rootDir>/jest.setup.js`
- `metro.config.js`: nativewind input `./src/global.css`
- `babel.config.js`: preset config, no paths

The **only** file edited is `apps/mobile/metro.config.js`, which gets the standard
Expo-monorepo resolver patch:

```js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './src/global.css' });
```

## Root files

**`package.json`**
```json
{
  "name": "pacergo-monorepo",
  "private": true,
  "packageManager": "yarn@4.x",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "mobile": "yarn workspace pacergo start",
    "mobile:ios": "yarn workspace pacergo ios",
    "mobile:android": "yarn workspace pacergo android",
    "test": "yarn workspace pacergo test",
    "typecheck": "yarn workspaces foreach -A run typecheck"
  }
}
```

**`tsconfig.base.json`** — shared strict options consumed by the packages (not the mobile
app, which keeps extending `expo/tsconfig.base`).

**`.yarnrc.yml`**
```yaml
nodeLinker: node-modules
```

## Scaffold packages

Each of `@pacergo/shared` and `@pacergo/api` gets a `package.json` (`version 0.0.0`,
`private: true`, `main`/`types` → `src/index.ts`), a `tsconfig.json` extending
`../../tsconfig.base.json`, and an empty `src/index.ts` barrel. Empty leaf dirs carry a
`.gitkeep`. `@pacergo/api` lists `@pacergo/shared` as a workspace dependency (`workspace:*`)
to establish the dependency direction; no code yet.

## Execution order

1. Branch `chore/monorepo-yarn-workspaces`; commit this spec.
2. `git mv` the app into `apps/mobile/` (all app files + assets/scripts/src; split
   `.gitignore` into root + app).
3. Patch `apps/mobile/metro.config.js`.
4. Create root `package.json`, `tsconfig.base.json`, `.yarnrc.yml`, updated root `.gitignore`.
5. Create `packages/shared`, `packages/api` scaffolds.
6. Create `apps/web`, `apps/website` placeholders.
7. Add `supabase/functions/.gitkeep`, `supabase/seed.sql`.
8. Switch to Yarn 4: remove `package-lock.json` + `node_modules`, `corepack enable`,
   `yarn set version stable`, set `nodeLinker`, `yarn install`.
9. **Verify:** `yarn workspace pacergo test` → 74 green; `tsc --noEmit` clean.
10. Commit.

## Verification (the checkpoint)

The migration is "done" only when `yarn install` succeeds, **all 74 tests pass** from the
new location, and typecheck is clean. If not, it isn't done.

## Out of scope (explicitly deferred)

- Extracting real types/schemas/helpers into `@pacergo/shared`.
- Extracting Supabase client/queries/mutations into `@pacergo/api`.
- Scaffolding the Next.js `web` and `website` apps.
- `supabase/config.toml`, edge functions, seed data content.
