---
version: alpha
name: fpl-auction-hub-design
description: FPL Auction Hub — a dark, data-heavy fantasy Premier League auction platform. Deep navy canvas, electric-mint green accent, hairline-bordered cards on always-dark surfaces. The interface reads like a fantasy football dashboard dressed as a trading terminal: dense stat tables, live auction rooms, and squad formation grids.

colors:
  primary: "#00e478"
  primary-hover: "#00b858"
  on-primary: "#003919"
  page: "#061423"
  card: "#0f1c2c"
  card-alt: "#0a1828"
  popover: "#132030"
  sidebar: "#020f1e"
  foreground: "#d6e4f9"
  foreground-muted: "#b9cbb9"
  foreground-dim: "#849585"
  secondary: "#1e2b3b"
  accent: "#283646"
  border-default: "#3b4b3d"
  border-light: "rgba(255,255,255,0.08)"
  destructive: "#93000a"
  destructive-foreground: "#f87171"
  input-bg: "#1e2b3b"
  chart-1: "#00e478"
  chart-2: "#bbc6e2"
  chart-3: "#c9e0ff"
  chart-4: "#ffb4ab"
  chart-5: "#afc9ea"
---


## Overview

FPL Auction Hub is a Fantasy Premier League auction management tool built for friend groups — and the brand wears that audience proudly: a deep-navy `{colors.page}` (`#061423`) page background that runs edge-to-edge with no light-mode counterpart, a single electric-mint green accent (`{colors.primary}` `#00e478`) reserved for CTAs, active indicators, and brand elements, and a typography system that uses Inter for all display and body roles.

The decorative system is restrained. There is no gradient mesh, no atmospheric backdrop, no illustration suite. Instead, the brand uses hairline-bordered cards on dark canvas, thin green dividers section separators, and precise stat tables that prioritise data density over ornament. The result is a page that feels like a trading terminal: every card has a hairline border, every stat is laid out in a dense grid, every auction event is timestamped.

Type stays calm. Headings use font-weight 700 for emphasis on section titles, body copy at 14 px Inter for legibility. Uppercase label styles are common — `FEATURES` or `ROLES` style — using font-semibold with wide tracking.

**Key Characteristics:**
- A single electric-mint green accent `{colors.primary}` (`#00e478`) carries every CTA, every active nav item, and all brand indicators. No second accent.
- Deep-navy canvas (`{colors.page}` `#061423`) is the only page surface — there is no light-mode rhythm; the entire site reads as one continuous dark surface broken by card boundaries.
- Hairline-bordered cards (`{colors.border-default}` `#3b4b3d`, 1 px solid) are the brand's primary chrome — no shadows, just precise hairline rectangles.
- Dense stat tables use fixed column widths and sticky headers — the brand prioritises scan-ability over whitespace.
- Inter carries every typographic role. No mono face is used; stats and code snippets both use Inter at appropriate weights.
- Buttons are rounded-lg (8 px), not pills. Only inline Badge tags use the pill shape.

## Colors

### Brand & Accent
- **Electric Mint** (`{colors.primary}` — `#00e478`): The single brand accent. Every primary CTA, every active nav item, the NProgress bar, every "live" indicator, focus rings. Reserved.
- **Primary Hover** (`{colors.primary-hover}` — `#00b858`): Slightly darker green for `:hover` and `:active` states on primary buttons.
- **On Primary** (`{colors.on-primary}` — `#003919`): Text colour placed on primary-green backgrounds — near-black to maintain contrast.

### Surface
- **Page** (`{colors.page}` — `#061423`): The default deep-navy page background. The only surface mode in the brand's system.
- **Card** (`{colors.card}` — `#0f1c2c`): Slightly lighter navy fill used inside cards, dialogs, and bordered containers.
- **Card Alt** (`{colors.card-alt}` — `#0a1828`): Alternate card surface used in the landing page feature grid.
- **Popover** (`{colors.popover}` — `#132030`): Surface for dropdowns, popovers, and floating panels.
- **Sidebar** (`{colors.sidebar}` — `#020f1e`): Darkest surface — used for the sticky nav bar and sidebar chrome.
- **Secondary** (`{colors.secondary}` — `#1e2b3b`): Used for active tab backgrounds, secondary button rests, and filled input states.
- **Accent** (`{colors.accent}` — `#283646`): Hover background for secondary / ghost interactive elements.

### Borders & Lines
- **Border Default** (`{colors.border-default}` — `#3b4b3d`): 1 px solid borders — cards, inputs, dividers. The brand's universal "edge" colour.
- **Border Light** (`{colors.border-light}` — `rgba(255,255,255,0.08)`): Subtle white border used in the landing page feature cards for a lighter touch on dark.
- **Input** (`{colors.input-bg}` — `#1e2b3b`): Filled input background with default border.

### Text
- **Foreground** (`{colors.foreground}` — `#d6e4f9`): Default text colour on dark — a light blue-white.
- **Foreground Muted** (`{colors.foreground-muted}` — `#b9cbb9`): Secondary body text — supporting copy, less prominent labels.
- **Foreground Dim** (`{colors.foreground-dim}` — `#849585`): Lowest-priority on-dark text — captions, fine print, footer lines.

### Semantic
- **Destructive** (`{colors.destructive}` — `#93000a`): Dark red background for destructive buttons and delete account sections.
- **Destructive Foreground** (`{colors.destructive-foreground}` — `#f87171`): Red text used for error messages and destructive labels.

### Charts
The chart palette uses five distinct hues for Recharts data visualisation (player stat comparisons, formation charts):
- `{colors.chart-1}` `#00e478` (green — primary metric)
- `{colors.chart-2}` `#bbc6e2` (blue-grey)
- `{colors.chart-3}` `#c9e0ff` (light blue)
- `{colors.chart-4}` `#ffb4ab` (salmon)
- `{colors.chart-5}` `#afc9ea` (steel blue)

## Typography

### Font Family
One face carries the system: **Inter** for every display, heading, body, button, and link role. Weights 400 / 500 / 600 / 700 are the working set. The font is loaded via `next/font/google` and exposed as the `--font-sans` CSS variable.

No monospace face is used. All stats, prices, and numeric data render in Inter — the brand prioritises visual consistency over the "code" connotation of a mono face.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| Landing page H1 | 36–48 px / 4xl–5xl | 700 | 1.2 | Hero headline. |
| Section H2 | 24–30 px / 2xl–3xl | 700 | 1.3 | Section headlines. |
| Card title | 16–20 px / base–xl | 600 | 1.4 | Card / feature titles. |
| Body default | 14 px / sm | 400 | 1.5 | Standard body text, table cells. |
| Body small | 13 px / xs | 400 | 1.5 | Table cells, captions, secondary text. |
| Label / input | 14 px / sm | 500 | 1.5 | Form labels, input values. |
| Caption | 12 px / xs | 400 | 1.5 | Fine print, timestamps, badges. |
| Button | 14 px / sm | 500 | 1 | Button labels. |
| Eyebrow uppercase | 12 px / xs | 600 | 1.2 | Uppercase labels above sections (`FEATURES`). |

### Principles
- **Single-face consistency** keeps the UI calm and predictable. No mixing serif, mono, or display faces.
- **Weight contrast** carries hierarchy: 700 for headings, 600 for card titles, 500 for buttons and labels, 400 for body.
- **Uppercase eyebrow with tracking** is used sparingly — only for section labels like "FEATURES" or "ROLES".

## Layout

### Spacing System
- **Base unit**: Tailwind's default scale (4 px increments). Padding and gaps use standard Tailwind tokens.
- **Section padding**: Landing page sections use `pb-20` (80 px) / `pb-28` (112 px) bottom padding; hero uses `pt-24` (96 px) / `pt-32` (128 px) top padding.
- **Card interior padding**: Cards use `p-5` (20 px) in profile settings; feature cards use `p-4` (16 px) in the landing page.
- **Nav bar**: Fixed `h-14` (56 px) height, sticky with backdrop blur.
- **Footer**: Fixed `h-9` (36 px) nav row.

### Grid & Container
- Content centres at `max-w-[1440px]` with `px-4 sm:px-6` gutters.
- Feature-card grids: 2-up and 3-up at desktop, 1-up at mobile.
- Player tables use TanStack Table with fixed column widths and horizontal scroll on mobile.

### Responsive Strategy

#### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Cards 1-up; stat grids 4-col; horizontal scroll on tables; bottom drawer for column controls. |
| Tablet | 640–1023px | Cards 2-up; table stays full-width. |
| Desktop | ≥ 1024px | Full grids; side panels on teams page; desktop toolbar. |

#### Touch Targets
Buttons render at `h-8` (32 px) default, `h-9` (36 px) large. Mobile uses larger tap targets for critical actions. Bottom drawers use `snap-points` from `vaul` for gesture-based interaction.

#### Collapsing Strategy
Nav collapses to hamburger menu on mobile; the overlay renders nav links and a profile link. Feature-card grids drop to 1-up on mobile. Player tables switch to card-based layout on mobile with collapsed stat selection.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Level 0 — Flat | No shadow, no border. | Full-bleed bands, page background. |
| Level 1 — Hairline | 1 px solid `{colors.border-default}` border. | Default for every card, input, and button. |
| Level 2 — Card alt | 1 px solid `{colors.border-light}` border on `{colors.card-alt}`. | Landing page feature cards. |
| Level 3 — Surface | Background colour shift (e.g. `{colors.secondary}` `#1e2b3b`). | Active nav items, filled inputs. |

### Decorative Depth
- Hairline cards on dark canvas — the brand's only true elevation mode.
- A 2 px solid `{colors.primary}` bottom border occasionally marks active nav items.
- NProgress uses a 3 px solid `{colors.primary}` bar for SSR navigation feedback.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `none` | 0px | Full-bleed bands, table cells. |
| `rounded-lg` | 8px | Default for cards, the main chrome shape. |
| `rounded-xl` | 12px | Profile settings cards, dialogs. |
| `rounded-full` | 9999px | Badge pills, circular icon containers.

## Components

### Buttons

**Primary CTA** — the electric-mint green action button.
- Background `{colors.primary}`, text `{colors.on-primary}`, border none, label 14 px / 500 weight, padding 10 px 20 px, shape `rounded-lg` 8 px.
- Hover: `{colors.primary-hover}` (`#00b858`).

**Outline** — the hairline-on-dark secondary button.
- Background transparent, text `{colors.foreground}`, 1 px solid `{colors.border-default}`, same padding / shape.
- Hover: background shifts to muted surface.

**Destructive** — red background for dangerous actions.
- Background `{colors.destructive}`, text white.

### Cards & Containers

**Default Card** — the standard bordered card.
- Background `{colors.card}`, text `{colors.foreground}`, 1 px solid `{colors.border-default}`, padding `p-5`, shape `rounded-xl`.

**Feature Card (landing)** — the landing page feature grid card.
- Background `{colors.card-alt}` (`#0a1828`), 1 px solid `{colors.border-light}` (`rgba(255,255,255,0.08)`), shape `rounded-xl`.

**Auth Card (login)** — centred sign-in / sign-up card.
- Background `{colors.card}`, shape `rounded-xl`, `max-w-sm`, with `absolute` background image overlay at 0.08 opacity.

### Tables

**Player Table** — TanStack Table with fixed column widths.
- Sticky header, `text-sm` (14 px) body, `text-xs` (13 px) on mobile, horizontal scroll container.
- Sortable columns with arrow indicators.

**Mobile Player Card** — Accordion-based card replacing the table on mobile.
- Top row: name + club + availability dot + position badge + chevron.
- Collapsed: 4-col stat grid (Points, Form, ICT, PPG).
- Expanded: remaining stats (xG, xA, CS, Value).

### Inputs & Forms

**Text Input** — the standard input on dark.
- Background `{colors.input-bg}`, text `{colors.foreground}`, 1 px solid `{colors.border-default}`, body 14 px, padding 10 px 12 px, shape `rounded-lg`.

**Label** — form label text.
- Text `{colors.foreground}`, 14 px / 500 weight.

### Navigation

**Nav Bar** — sticky top nav on dark.
- Background `{colors.sidebar}` (`#020f1e` / 95), backdrop blur, border-bottom 1 px `{colors.border-default}`, height `h-14`.

**Nav Link** — link items in the top nav.
- Default: text `{colors.foreground-muted}`.
- Active: background `{colors.secondary}`, text `{colors.primary}`.
- Hover: background `#132030`, lighter text.

**Footer** — the dark footer strip.
- Border-top 1 px `{colors.border-default}/50`, text `{colors.foreground-dim}` (`#849585`), height `h-9` nav row.

### Drawers & Dialogs

**Mobile Drawer** — bottom drawer from `vaul` for mobile controls.
- Background `{colors.card}`, `snap-points` from vaul, used for column visibility and export field selection.

**Dialog (player detail)** — centred modal for player detail view.
- Background `{colors.popover}`, shape `rounded-xl`, image at top.

### Badges & Indicators

**Availability Dot** — small coloured dot next to player name.
- Green: available. Grey: unavailable. Small `w-1.5 h-1.5 rounded-full`.

**Position Badge** — GKP / DEF / MID / FWD label.
- Background transparent, text `{colors.primary}`, uppercase 11 px, `font-semibold`.

### Charts

Recharts-based visualisations:
- Line charts for stat comparisons.
- Bar charts for budget / price distribution.
- 5-colour palette (`{colors.chart-1}` through `{colors.chart-5}`).

### Export

**Export Sheets Button** — two-step drawer flow.
- Step 1: field picker checkboxes.
- Step 2: CSV download or Google Sheets export.
- Google Sheets uses GIS OAuth — token stored in-memory React ref, never sent to our server.

### Examples (illustrative)

The component styles listed above are the primary design tokens. Example surfaces (pricing cards, empty states, toasts) should inherit from the same card / border / text primitives.


## Do's and Don'ts

### Do
- Reserve `{colors.primary}` (`#00e478`) for every primary CTA, every active nav item, and live-status indicators. The green is the brand's centre of gravity.
- Use the dark `{colors.page}` (`#061423`) as the only page surface. There is no light-mode rhythm.
- Build cards with 1 px `{colors.border-default}` borders, not shadows. Hairlines on dark IS the brand's elevation system.
- Use Inter (sentence-case) for every role — display, body, button, label. No second face.
- Use `rounded-lg` 8 px for cards and buttons, `rounded-xl` 12 px for dialogs, `rounded-full` only for badges.
- Keep data dense — tables should show as many rows as possible without wasted whitespace.
- Use `{colors.primary}` as the NProgress bar colour for consistent navigation feedback.
- Prefix all CSS custom properties in the `:root` block with semantic names (`--card`, `--muted-foreground`, etc.).

### Don't
- Don't introduce a light-mode counterpart. The brand is dark-canvas only.
- Don't use the primary green as a body-text fill. It's CTA / indicator only.
- Don't drop soft shadows on cards. The brand uses hairlines, never material shadows.
- Don't use display fonts, serif faces, or monospace faces — Inter covers every role.
- Don't add background images or photography to content pages. The login page uses a subtle watermark image at 0.08 opacity — that's the limit.
- Don't use gradient text, gradient buttons, or gradient borders. Everything is flat colour.
- Don't use pill-shaped buttons — only inline Badge tags use full rounding.
