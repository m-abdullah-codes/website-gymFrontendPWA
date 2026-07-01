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
├── app/              # Next.js App Router pages & layouts
├── components/
│   ├── layout/       # App shell, header, bottom navigation
│   └── memberships/  # Feature-specific components
├── data/             # Static/mock data (replace with API later)
├── lib/              # Shared utilities (cn, etc.)
└── styles/
    └── tokens.css    # Design tokens (colors, spacing, radius)
```

## Design System

All visual tokens live in `src/styles/tokens.css`. Tailwind consumes them via `@theme` in `globals.css`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-deep` | `#000814` | Page gradient top |
| `--color-bg-base` | `#000000` | Page background |
| `--color-accent` | `#2B59FF` | Active states, glows |
| `--color-text-secondary` | `#94A3B8` | Subtitles, metadata |
| `--radius-card` | `2rem` | Membership cards |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
