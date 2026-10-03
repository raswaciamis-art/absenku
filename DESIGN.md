# Design Brief

## Direction

Presensi Tenang — a calm, trustworthy Indonesian attendance tool where the daily clock card is the anchor and every action feels verified and accounted for.

## Tone

Refined workplace minimalism — restrained, high-legibility, editorial clarity like Linear/Stripe; no decoration that competes with time and status.

## Differentiation

A monospace tabular time readout as the visual hero, paired with teal-green verification cues that make "hadir" feel confirmed rather than merely logged.

## Color Palette

| Token      | OKLCH         | Role                                              |
| ---------- | ------------- | ------------------------------------------------- |
| background | 0.975 0.006 165 | Cool off-white app canvas (light)               |
| foreground | 0.22 0.02 165   | Primary text, high contrast on canvas           |
| card       | 1.0 0.002 165   | White elevated surfaces: clock card, lists      |
| primary    | 0.42 0.09 168   | Deep teal-green — Absen Masuk, active nav, trust |
| accent     | 0.72 0.15 70    | Warm amber — Absen Keluar, attention, pending   |
| muted      | 0.945 0.01 165  | Secondary surfaces, disabled/inactive fills     |
| success    | 0.55 0.13 160   | "Sudah Masuk" / verified location                |
| destructive| 0.53 0.2 27     | Errors, out-of-radius, rejected permission       |

## Typography

- Display: Space Grotesk — headings, big clock readout, numerals with tight tracking
- Body: Plus Jakarta Sans — UI labels, body copy, Indonesian microcopy
- Mono: JetBrains Mono — timestamps, tabular in/out times in history and admin tables
- Scale: hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Flat canvas with layered white surfaces: cards use `shadow-card`, focus/active elements use `shadow-elevated`; depth comes from borders + soft shadows, never gradients or glass.

## Structural Zones

| Zone    | Background        | Border    | Notes                                                        |
| ------- | ----------------- | --------- | ------------------------------------------------------------ |
| Header  | `bg-card`         | `border-b`| Wordmark + avatar; sticky on mobile, holds nav on desktop    |
| Content | `bg-background`   | —         | Alternate sections with `bg-muted/30`; cards on top          |
| Sidebar | `bg-sidebar`      | `border-r`| Admin desktop nav; active item `bg-sidebar-accent` + primary |
| Footer  | `bg-muted/40`     | `border-t`| Legal/version strip only; low emphasis                       |

## Spacing & Rhythm

Mobile-first: `px-4` gutters, `space-y-4` card stacks, `py-6` section gaps; desktop expands to `px-8`/`max-w-6xl`; micro-spacing `gap-2`/`gap-3` inside rows and chips.

## Component Patterns

- Buttons: `rounded-xl`, solid teal-green primary for Absen Masuk, amber-tinted for Absen Keluar, `shadow-card`, `transition-smooth`, disabled at `opacity-50`; min 48px tap height
- Cards: `rounded-2xl bg-card border shadow-card p-5`; clock card is the largest surface
- Badges: pill `rounded-full` — green "Sudah Masuk", amber "Sudah Keluar", grey "Belum Absen", red for errors; `text-xs font-semibold`

## Motion

- Entrance: `animate-fade-in` on cards and list rows, 0.35s staggered by index
- Hover: `transition-smooth` on buttons/cards, subtle translate-y and shadow lift
- Decorative: `animate-pulse-ring` on the active clock button; `animate-scan-line` inside the selfie camera frame

## Constraints

- All UI copy in Indonesian; statuses are exactly belum absen / sudah masuk / sudah keluar
- Never use raw hex/rgb in components — semantic tokens only (`bg-primary`, `text-foreground`)
- Light theme is primary; `.dark` token set must stay AA+ readable and tuned, not inverted
- No CSV/Excel export and no email reminder surfaces — do not reserve zones for them

## Signature Detail

The tabular monospace clock readout (`text-clock`) that never jitters as digits change — the calm, precise center of every employee's day.
