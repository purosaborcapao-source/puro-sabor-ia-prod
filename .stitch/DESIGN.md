# Design System: Puro Sabor IA — Admin Dashboard

## 1. Visual Theme & Atmosphere

**Identity:** An operational command center for a Brazilian artisan bakery. The interface sits at the precise intersection of precision and warmth — think the control room of a small, well-run operation. Clinical clarity in the structure, human warmth in the data it serves.

**Density:** 6 — Daily App Balanced. Enough breathing room to scan quickly under pressure; dense enough to never feel toy-like.

**Variance:** 5 — Controlled asymmetry. The dashboard splits content with a 7/5 column grid; inner pages are left-aligned and functional. No pure symmetry.

**Motion:** 3 — Restrained. A single `animate-pulse` on the online status indicator; AI suggestion icons pulse gently. Everything else is instant or a fast CSS transition (150ms). No theatrical animations on an operational tool.

**Philosophy:** No decorative surfaces. Every visual element communicates operational state. The "command center" aesthetic is earned through typography, color semantics, and information density — not through glassmorphism, gradients, or neon effects. When in doubt, subtract.

---

## 2. Color Palette & Roles

### Base (Dark Mode — Primary Context)
- **Void Black** (`#050505`) — Page/body background. The deepest surface.
- **Surface Near-Black** (`#0A0A0A`) — Cards, panels, sidebar fills. One step above void.
- **Zinc Smoke** (`#18181B` / `zinc-900`) — Sidebar background, active nav items.
- **Border Dim** (`rgba(39,39,42,1)` / `zinc-800`) — Structural borders between panels.
- **Border Faint** (`rgba(63,63,70,0.5)` / `zinc-700` at 50%) — Inner card dividers.

### Base (Light Mode — Secondary Context)
- **Canvas Off-White** (`#F9FAFB` / `gray-50`) — Page background in light mode.
- **Panel White** (`#FFFFFF`) — Cards, modals, sidebar in light mode.
- **Border Whisper** (`#E4E4E7` / `zinc-200`) — Structural borders.

### Text
- **Ink Primary** (`#FAFAFA` / `zinc-50`) — All primary text on dark backgrounds.
- **Ink Secondary** (`#A1A1AA` / `zinc-400`) — Metadata, labels, secondary copy.
- **Ink Tertiary** (`#71717A` / `zinc-500`) — Timestamps, placeholder, disabled states.
- **Ink Dark** (`#18181B` / `zinc-900`) — Primary text on light backgrounds.

### Semantic Accents (Operational Color Language)
Each accent maps to a strict operational meaning. Never cross-use.

- **Command Blue** (`#2563EB` / `blue-600`) — Primary actions, CTAs, active navigation, links. The single dominant interactive accent.
- **Alert Orange** (`#EA580C` / `orange-600`) — Pending states, unconfirmed orders, attention required. Never decorative.
- **System Green** (`#059669` / `emerald-600`) — Online status, confirmed, paid, success. Sparingly: only for true positive state.
- **AI Violet** (`#9333EA` / `purple-600`) — Reserved exclusively for AI-generated content (suggestions, automated responses, AI indicators). Never use for generic UI.
- **Critical Red** (`#DC2626` / `red-600`) — Errors, cancellations, debt/overdue, destructive actions.
- **Timestamp Amber** (`#D97706` / `amber-600`) — In-transit/in-delivery state ("Saiu p/ Entrega"). Temporal, moving state.

### Strictly Banned
- Pure `#000000` black — use Void Black (`#050505`) instead
- Neon purple or blue glows — the "AI aesthetic" cliché
- Gradient backgrounds on surfaces
- Warm gray mixed with cool gray on the same screen

---

## 3. Typography Rules

### Font Stack
- **Primary (UI):** `Geist` — for all headings, labels, body, navigation. Clean, modern sans with strong weight range. Pairs naturally with the command-center aesthetic.
- **Monospace:** `Geist Mono` — for order numbers (`#PD-0001`), timestamps, metrics/KPIs, terminal-style labels, any data that must align in columns.
- **Banned:** `Inter` (too generic), `Times New Roman`, `Georgia`, any decorative serif. This is a software UI — serifs are strictly banned.

### Scale & Weight Usage
- **KPI Numbers (XL):** `Geist Mono`, `text-5xl` (`3rem`), `font-black` (900), `tracking-tighter`. Used only for the four DayMetrics blocks on the dashboard.
- **Section Label:** `Geist`, `text-xs` (`0.75rem`), `font-black` (900), `tracking-widest`, `uppercase`. Example: "ATENÇÃO OPERACIONAL", "MENSAGENS RECENTES". These function as screen-reader-friendly category markers.
- **Page Title:** `Geist`, `text-2xl`, `font-bold` (700). Used in page headers.
- **Card Label/Key:** `Geist`, `text-xs`, `font-bold` (700), `tracking-widest`, `uppercase`, color `zinc-400/zinc-500`. The label above a value.
- **Body / Table Row:** `Geist`, `text-sm` (`0.875rem`), `font-medium` (500), `zinc-800 / zinc-200`.
- **Metadata / Timestamps:** `Geist Mono`, `text-xs`, `font-medium`, `zinc-500 / zinc-400`.
- **Badge / Status Pill:** `Geist`, `text-[10px]` to `text-xs`, `font-bold`, always paired with a background color.

### Line Length
- Body copy: `max-w-[65ch]`. Never let prose run full-width.
- Table cells: unrestricted but with `overflow-hidden text-ellipsis` on long strings.

### Anti-Patterns
- No massive display headlines — this is an ops tool, not a marketing site
- No italic for anything except customer observation quotes in order cards
- No `tracking-normal` on any uppercase label — tracking must be `widest` or `tight`

---

## 4. Component Stylings

### Buttons
- **Primary:** `bg-blue-600 hover:bg-blue-700 text-white font-semibold`, `rounded-lg`, `px-4 py-2`. Transition `150ms`. Active state: `-translate-y-px` (1px tactile push). No outer glow, no shadow on primary.
- **Destructive:** `bg-red-600 hover:bg-red-700 text-white`. Same shape as primary.
- **Ghost/Icon:** `p-2 rounded-lg`, color `zinc-400`, hover `text-zinc-900 bg-zinc-100 dark:hover:bg-zinc-800`. No border on default state.
- **Sign-out:** hover transitions to `text-red-500 bg-red-50 dark:bg-red-900/20`.
- **Disabled:** `opacity-50 cursor-not-allowed`. No other change.

### Navigation Sidebar
- Fixed left, `w-52` (208px) on desktop. Single column icon + label.
- Active item: `bg-zinc-900 text-white rounded-xl shadow-lg` (dark mode), `bg-zinc-900 text-white` (light).
- Inactive item: `text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900`.
- Bottom: User avatar (initial letter, `w-8 h-8`, `rounded-full`) + name + role label, plus sign-out icon button.
- Mobile: full-screen overlay menu with labels visible. Closes on navigation.

### Cards / Panels
- **Border-based (preferred):** `border border-zinc-200 dark:border-zinc-800`, `bg-white dark:bg-[#0A0A0A]`. No drop shadow on dark mode. Subtle `shadow-sm` on light mode only.
- **No rounded corners on structural panels** — use sharp edges for the command-center aesthetic. The dashboard main panels are square-cornered.
- **Status badge inside card:** `rounded-full` pill with semantic accent background at 10% opacity + matching text color.
- **Order cards (kanban/timeline):** `rounded-lg`, `shadow-sm hover:shadow-md`, `hover:border-blue-300`. The only context where rounded corners and hover shadow elevation coexist.

### KPI Metric Blocks (DayMetrics)
- Horizontal strip, no border-radius. Full-width, divided by vertical `border-r`.
- Left accent bar: `w-1 h-full absolute`, colored by semantic accent (blue/orange/emerald/purple).
- Each block is a `<Link>` — the entire block is clickable. Hover state: `bg-gray-50 dark:bg-white/[0.02]` subtle tint.
- KPI number: `text-5xl font-black tracking-tighter` in Geist Mono, colored by accent.

### Pendências (Alert List)
- Items with active count: left `w-1` accent bar, background `orange-50/50 dark:orange-950/10` tint.
- Items clear: `opacity-40`, no accent bar, checkmark icon.
- "Ver" action button: `bg-orange-600 hover:bg-orange-700 text-white uppercase font-bold tracking-widest text-xs px-4 py-2`. Sharp corners (no border-radius).
- Empty state: `bg-emerald-500/10 border-emerald-500/20 text-emerald-700`. Message: "System Clear // Operação Estável".

### Status Badges
Always use human-readable Portuguese labels (never raw enum strings):
- `NOVO` → "Novo" — blue
- `PENDENTE` → "Pendente" — yellow
- `ACEITO` → "Aceito" — cyan
- `PREPARANDO` → "Preparando" — purple
- `PRONTO` → "Pronto" — emerald
- `SAIU_ENTREGA` → "Saiu p/ Entrega" — amber
- `ENTREGUE` → "Entregue" — green
- `CANCELADO` → "Cancelado" — red

Payment status badges follow the same pill shape with their own color scheme (red/blue/green/purple).

### Inputs / Forms
- Label above input (`block text-sm font-medium mb-2`), never floating.
- Input: `border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`.
- Error: `border-red-500` + `<p className="text-red-500 text-sm mt-1">` below input.
- Helper text (when needed): `text-zinc-400 text-xs mt-1`.
- No custom styled selects — use browser native or a simple styled wrapper.

### Loading States
- Page-level: centered `<p className="text-gray-600 dark:text-gray-400">Carregando...</p>`. No spinners.
- Full-app load (DashboardLayout): animated progress bar (`translateX` from -100% to 100%) + pulsing bread emoji. This "Sincronizando Sessão" state uses a monospace tracking label.
- Skeletal loaders for data tables: rectangular blocks matching row dimensions, `animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded`. Never circular spinners.

### AI Suggestion Indicator
- `<Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" />` inline in order card header.
- This is the only permitted `animate-pulse` on content (besides the system online dot).
- Never use for non-AI features.

### Empty States
- Composed text block explaining the state and how to populate it.
- Use the operational vocabulary: "Nenhum pedido encontrado para os filtros selecionados."
- Never just "No data." — provide context and next action.

---

## 5. Layout Principles

### Grid Architecture
- **Dashboard:** `max-w-[1600px] mx-auto` container. Main grid: `grid-cols-1 lg:grid-cols-12`. Pendências: `col-span-7`. Mensagens: `col-span-5`.
- **Inner pages (Pedidos, Clientes, etc.):** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Single column stacked sections.
- **Settings:** Full-width tabbed layout inside page container.
- CSS Grid for all multi-column layouts. No `calc()` percentage hacks. No `display: flex` with percentage `flex-basis` math.

### Spacing Philosophy
- Section gaps: `space-y-8` (`2rem`) between major dashboard sections.
- Card internal padding: `p-4` (standard) to `p-6 md:p-8` (KPI blocks).
- Header height: `h-16` (mobile top bar), sidebar top section `h-16`.
- All spacing is multiples of `0.25rem` (4px grid). Never odd values.

### Structural Rules
- No overlapping elements — every element has its own distinct spatial zone.
- No absolute-positioned content stacking over other content (exception: left accent bars `w-1`).
- Sticky headers only for the sidebar (fixed) and mobile top bar (fixed). Page content never stickies unless it's a filter bar.
- Max-width containers prevent ultra-wide layouts. Content never runs edge-to-edge on large screens.

### View Mode Toggle (Orders)
- Pill toggle with `bg-gray-100 dark:bg-gray-900 p-1 rounded-lg` container.
- Active button: `bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm rounded-md`.
- Inactive button: `text-gray-600 hover:text-gray-900` — no background, no border.

---

## 6. Motion & Interaction

### Guiding Principle
This is an ops dashboard used under time pressure. Motion should never create latency or distraction. Every animation must be either imperceptible (150ms transitions) or intentionally semantic (the pulse means "live/active").

### Permitted Animations
- **CSS Transition:** `transition-colors 150ms`, `transition-all 150ms` — buttons, hover states, sidebar links.
- **Pulse (Semantic):** `animate-pulse` — reserved for: (1) system online indicator dot, (2) AI suggestion `<Brain>` icon. These pulse forever while active, communicating live state.
- **Loading Bar:** `translateX(-100% → 100%)` infinite ease-in-out — only during auth load state.
- **Shadow Lift:** `hover:shadow-md` on order kanban cards — the only shadow-based interaction.
- **Opacity Fade:** Disabled/inactive states use `opacity-40` — no transition needed.

### Banned Motion
- No `framer-motion` page transitions — route changes are instant.
- No scroll-triggered animations — content is always visible.
- No skeleton shimmer that's slower than 1.5s — fast data loading means skeletons are brief.
- Never animate `top`, `left`, `width`, `height` — transform and opacity only.

---

## 7. Dashboard-Specific Patterns

### Header Bars (per page)
- Dashboard: Ultra-minimal — system status dot + "System: Online" label in `tracking-widest uppercase text-xs`. Operator name + date on the right. This is a terminal prompt aesthetic.
- Inner pages (Pedidos, etc.): `bg-white dark:bg-gray-800 shadow` with page title (`text-2xl font-bold`) and primary action button (right-aligned).

### Quick Commands Section
- Terminal-style link cards: `font-black tracking-wider text-xs uppercase`. Text is `/PEDIDOS`, `/MENSAGENS`, etc. — with the slash prefix.
- Each card has a right-aligned `→` arrow that transitions to accent color on hover.
- Section label: `>_ QUICK COMMANDS` in monospace style.

### Section Labels
- All section labels follow: `<span className="w-1.5 h-4 bg-[accent]"></span>` + `UPPERCASE TRACKING-WIDEST TEXT-XS FONT-BLACK text-[accent]`
- The colored square is not decorative — it's a semantic color key matching the section's accent.

---

## 8. Anti-Patterns (Strictly Banned)

### Typography
- `Inter` font — use `Geist` instead
- Serif fonts in any dashboard context
- `tracking-normal` on uppercase labels
- Gradient text on any element larger than `text-sm`
- AI copywriting clichés: "Seamless", "Elevate", "Unleash", "Next-Gen", "Cutting-Edge"

### Color
- Pure `#000000` black
- Neon purple or blue glow effects
- `box-shadow: 0 0 20px rgba(99,102,241,0.5)` or any outer glow
- Oversaturated accents (saturation > 80%)
- Warm grays mixed with cool grays on the same screen
- Multiple accent colors used decoratively (every accent has a strict semantic role)

### Layout
- Centered hero sections (this is a dashboard, not a landing page)
- Overlapping elements
- `calc()` percentage hacks for grid math
- `h-screen` — use `min-h-[100dvh]` for full-height sections
- Three equal-width cards in a horizontal feature row
- Horizontal scroll on any viewport

### Components
- Circular loading spinners (`<Spinner />`, `<CircularProgress />`)
- Custom mouse cursors
- Emoji icons used as functional UI indicators — use Lucide icons with `aria-label`
- Raw enum strings as user-facing text (`SAIU_ENTREGA`, `SINAL_PENDENTE`) — always translate to Portuguese
- `LABEL // YEAR` formatting ("METRICS // 2025") — this is a low-effort AI convention
- Floating labels on form inputs

### Content
- Fabricated metrics, uptime numbers, or performance statistics that weren't explicitly provided
- Generic placeholder names ("João da Silva", "Empresa Exemplo")
- Fake round numbers used as data (`99.9% uptime`, `500+ orders`)
- Filler nav text: "Scroll para ver mais", scroll arrows, bouncing chevrons
- Broken or placeholder image URLs — use `picsum.photos/{id}` or initials avatars
