# Gym User App

Commercial gym membership application built with Next.js.

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide React** (icons)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the starter memberships page.

## Project Structure

```
src/
├── app/              # Next.js App Router pages & layouts (page, loading, error, not-found)
├── components/
│   ├── ui/           # Reusable design-system primitives — start here for any new UI
│   ├── layout/       # App shell, header, bottom navigation
│   └── memberships/  # Feature-specific components (card, carousel)
├── data/             # Static/mock data (replace with API later)
├── lib/              # Shared utilities (cn, etc.)
└── styles/
    └── tokens.css    # Design tokens (colors, spacing, radius)
```

## Design System

All visual tokens live in `src/styles/tokens.css` as plain CSS custom properties. `globals.css` re-exposes a subset of them as Tailwind theme colors/radii via `@theme inline` (e.g. `--color-ink` → the `text-ink`/`bg-ink` utilities); tokens without a Tailwind name are still available anywhere via arbitrary-value syntax, e.g. `px-[var(--spacing-page-x)]`.

**Background**

| Token                                       | Value                | Tailwind utility   | Usage                                      |
| ------------------------------------------- | -------------------- | ------------------ | ------------------------------------------ |
| `--color-bg-base`                           | `#000000`            | `surface`          | Page background                            |
| `--color-bg-deep`                           | `#000814`            | `surface-deep`     | Page gradient top, viewport `theme-color`  |
| `--color-bg-elevated`                       | `#0a1628`            | `surface-elevated` | Elevated circles (avatar ring background)  |
| `--color-button-muted`                      | `rgba(30,41,59,0.8)` | `surface-muted`    | Muted button/badge backgrounds             |
| `--color-bg-surface` / `--color-bg-overlay` | translucent navy     | — (CSS var only)   | Reserved for future overlay/sheet surfaces |

**Accent**

| Token                 | Value                  | Tailwind utility | Usage                               |
| --------------------- | ---------------------- | ---------------- | ----------------------------------- |
| `--color-accent`      | `#2B59FF`              | `accent`         | Active states, glows, focus accents |
| `--color-accent-glow` | `rgba(43,89,255,0.45)` | `accent-glow`    | Drop-shadow/glow effects            |
| `--color-accent-soft` | `rgba(43,89,255,0.15)` | — (CSS var only) | Soft accent fills                   |

**Text**

| Token                    | Value     | Tailwind utility | Usage                                              |
| ------------------------ | --------- | ---------------- | -------------------------------------------------- |
| `--color-text-primary`   | `#ffffff` | `ink`            | Headings, primary content                          |
| `--color-text-secondary` | `#94A3B8` | `ink-secondary`  | Subtitles, metadata                                |
| `--color-text-muted`     | `#64748b` | `ink-muted`      | De-emphasized text                                 |
| `--color-text-inverse`   | `#0f172a` | `ink-inverse`    | Text on light/white surfaces (e.g. primary Button) |

**Border & UI**

| Token                                              | Value                               | Tailwind utility | Usage                                                |
| -------------------------------------------------- | ----------------------------------- | ---------------- | ---------------------------------------------------- |
| `--color-border-subtle`                            | `rgba(255,255,255,0.08)`            | `border-subtle`  | Default hairline rings (`ring-1 ring-border-subtle`) |
| `--color-border-strong`                            | `rgba(255,255,255,0.15)`            | — (CSS var only) | Emphasized borders                                   |
| `--color-badge-active`                             | `#ffffff`                           | `badge`          | Active-status badge background                       |
| `--color-progress-track` / `--color-progress-fill` | `rgba(255,255,255,0.2)` / `#ffffff` | `track` / `fill` | `ProgressBar` component                              |
| `--color-card-border`                              | `rgba(105,150,225,0.24)`            | — (CSS var only) | MembershipCard outer border                          |

**Radius & Layout**

| Token                                         | Value                | Tailwind utility | Usage                                |
| --------------------------------------------- | -------------------- | ---------------- | ------------------------------------ |
| `--radius-card`                               | `2rem`               | `radius-card`    | Membership cards                     |
| `--radius-nav`                                | `2.5rem`             | `radius-nav`     | Bottom nav pill (desktop)            |
| `--radius-button`                             | `9999px`             | — (CSS var only) | Fully-rounded buttons                |
| `--spacing-page-x` / `--spacing-page-y`       | `1.5rem` / `1.25rem` | — (CSS var only) | `AppShell` page padding              |
| `--max-width-content` / `--max-width-desktop` | `28rem` / `72rem`    | — (CSS var only) | Content vs. desktop shell width caps |
| `--bottom-nav-height`, `--nav-*-size`         | various              | — (CSS var only) | Bottom nav sizing                    |

A further ~30 highly-specific `--card-*` tokens in `tokens.css` exist only to drive `MembershipCard`'s layered gradient "cradle" background and glow effects — they're intentionally single-purpose and not meant to be reused elsewhere.

**Note:** `HomeButton` (in `components/layout/`) is styled with a CSS Module (`HomeButton.module.css`) instead of Tailwind utilities. This is a deliberate exception, not a pattern to copy — its conic-gradient rim and multi-layer glow are easier to express as hand-written CSS than as Tailwind arbitrary values. Everything else in the app follows the Tailwind + token convention above.

## Component Inventory

| Folder                    | Purpose                                                                        | Contains                                                                  |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `components/ui/`          | Reusable design-system primitives. Start here for any new interactive element. | `Button`, `Badge`, `ProgressBar`, `IconButton`                            |
| `components/layout/`      | App-wide chrome, rendered once per page via `AppShell`.                        | `AppShell`, `AppHeader`, `BottomNav`, `HomeButton`, `NavIcons` (internal) |
| `components/memberships/` | Feature-specific to the memberships domain.                                    | `MembershipCard`, `MembershipCarousel`, `Membership` type                 |

**When adding a new page or feature:** reach for a `components/ui/` primitive (`Button`, `Badge`, `IconButton`, `ProgressBar`) before writing new Tailwind JSX from scratch. Only add a new file to `components/ui/` when a visual pattern will be reused across 2+ features — one-off, feature-specific UI belongs in its own feature folder instead.

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `npm run dev`    | Start development server |
| `npm run build`  | Production build         |
| `npm run lint`   | Run ESLint               |
| `npm run format` | Format with Prettier     |
