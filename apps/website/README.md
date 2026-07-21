# @pacergo/website

PacerGo's **public marketing site** — Next.js 15 (App Router) + Tailwind v4.

## Develop

```bash
yarn install                          # from the monorepo root
yarn workspace @pacergo/website dev   # http://localhost:3000
```

Other scripts: `build`, `start`, `typecheck`.

## Design system

A deliberately tiny token set — the brand is the entire palette. **Every neutral is
an opacity of ink or paper; no colors live outside these three values.**

| Token            | Value     | Role                         |
| ---------------- | --------- | ---------------------------- |
| `--color-brand`  | `#1565ff` | blue — the single accent     |
| `--color-ink`    | `#0a0a0a` | black — text & dark sections |
| `--color-paper`  | `#f5f7fa` | off-white — page background  |

Tokens live in [`src/app/globals.css`](src/app/globals.css) (`@theme`), so Tailwind
utilities are `bg-brand`, `text-ink`, `bg-paper`, and opacity modifiers like
`text-ink/60` / `border-ink/10`.

**Type:** Bricolage Grotesque (display) · Hanken Grotesk (body) · JetBrains Mono (labels).

## Structure

```
src/
  app/
    layout.tsx        # metadata + fonts
    page.tsx          # composes the landing sections
    globals.css       # design tokens + motion primitives
  components/site/    # Nav, Hero, PhoneMock, Marquee, Steps, Tiers, Safety, Cta, Footer, Reveal
  lib/utils.ts        # cn() — clsx + tailwind-merge
```

## Notes

- Primary conversion CTAs link to the PacerGo Web App sign-in page with
  website UTM attribution.
- English and Traditional Chinese copy live in locale files.
