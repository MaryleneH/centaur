# Centaur — Design System

Monochrome instrument. Two themes. No accent hue anywhere. Meaning is carried by **position, type weight, and label** — never color.

Token source of truth: `tokens.css` (CSS custom properties) and `tokens.json` (machine-readable). Apply a theme by setting `data-theme="dark"` or `data-theme="light"` on `<html>`.

---

## Color

Every value is a near-neutral with a faint cool cast (oklch hue 240, chroma ≤ 0.006). Lightness does all the work. Hex values below are exact equivalents of the oklch source.

### Dark (default)
| Token | Hex | Role |
|---|---|---|
| `--bg` | `#0d0f10` | page background (a deep near-black, not pure black) |
| `--surface` | `#161719` | cards, inputs, raised readouts |
| `--surface-2` | `#1d1f20` | quoted-signal chips, nested fills |
| `--line` | `#2d2f31` | default hairline border |
| `--line-soft` | `#212325` | quiet dividers (between log rows, sections) |
| `--line-strong` | `#4b4d4f` | emphasized ticks, focused input border |
| `--fg` | `#e8eaeb` | primary text, the needle, primary-button fill |
| `--fg-dim` | `#909294` | secondary text, captions, corrective body |
| `--fg-faint` | `#5a5c5e` | labels, placeholders, inactive ticks/needle |

### Light
| Token | Hex | Role |
|---|---|---|
| `--bg` | `#f3f4f5` | paper-white page |
| `--surface` | `#fefeff` | cards, inputs |
| `--surface-2` | `#ebedef` | chips, nested fills |
| `--line` | `#d6d8da` | default hairline |
| `--line-soft` | `#e3e5e7` | quiet dividers |
| `--line-strong` | `#aeb1b4` | emphasized ticks, focused border |
| `--fg` | `#191c1e` | primary text, needle, primary-button fill |
| `--fg-dim` | `#545759` | secondary text |
| `--fg-faint` | `#87898b` | labels, placeholders, inactive ticks |

**Inverted pair** (both themes): `--inv-bg: var(--fg)`, `--inv-fg: var(--bg)`. Used only for the primary button (fg-colored block, bg-colored text).

**Selection**: `::selection { background: var(--fg); color: var(--bg); }`

> Do not introduce category colors. A common temptation is green/amber/red for Direct/Delegate/Defer. That breaks the core principle: the product measures, it does not judge. If you need to distinguish categories, use axis position and label weight.

---

## Typography

Two families, loaded 400/500/600 (sans) and 400/500 (mono).

- `--font-sans: "Geist", ui-sans-serif, system-ui, sans-serif` — prose: questions, rationale, corrective copy, task echo, definitions.
- `--font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace` — **all data**: wordmark, nav, labels, verdict category, confidence, timestamps, the hero number, field meta, button text.

### Roles (size / weight / line-height / tracking)
| Role | Family | Size | Weight | LH | Tracking | Notes |
|---|---|---|---|---|---|---|
| Drift hero number | mono | 64 | 500 | 0.86 | -0.03em | the `%` glyph is 26px, `--fg-dim` |
| Verdict category | mono | 21 | 500 | 1.05 | 0.02em | on result, top-right |
| Capture prompt lead | sans | 23 → 27 | 400 | 1.32 | -0.012em | 27px at ≥640px; `max-width: 22ch`, balanced |
| Task echo | sans | 17 | 400 | 1.5 | -0.006em | the user's words on the result |
| Rationale | sans | 15.5 | 400 | 1.55 | -0.005em | pretty wrap |
| Drift sentence | sans | 15.5 | 400 | 1.5 | — | `max-width: 36ch` |
| Body / definitions / corrective | sans | 14–14.5 | 400 | 1.5–1.55 | — | dim for corrective body |
| Capture input | sans | 16 | 400 | 1.5 | — | **16px floor** to stop iOS zoom-on-focus |
| Label (`.label`) | mono | 11 | 500 | 1 | 0.16em | UPPERCASE, `--fg-faint` |
| Nav item | mono | 11 | 400 | — | 0.12em | UPPERCASE |
| Mono small (timestamps, field meta, confidence) | mono | 10.5–12 | 400 | — | 0.02–0.06em | — |

The **wordmark** is type, not a logo: `CENTAUR` in mono, 12.5px, weight 500, `letter-spacing: 0.34em`, preceded by a 6px filled circle (`--fg`) with a 9px gap.

---

## Spacing & layout

- **4px base unit.** Generous vertical rhythm — negative space is the dominant element.
- **Content column**: `max-width: 540px`, centered, side padding `24px` (mobile) / `32px` (≥640px).
- **Header**: 52px tall, sticky, `backdrop-filter: blur(10px)` over a translucent bg, 1px `--line-soft` bottom border.
- **Cards**: 1px border, radius `3px`, `--surface` fill. Drift card padding `28px 24px 26px`. No drop shadows anywhere — the system is flat and uses hairlines for separation.
- **Controls**: primary button min-height **56px** (thumb target). General tap-target floor **44px**.
- **Radii**: `--r-sm: 2px` (chips, nav items, icon buttons), `--r-md: 3px` (inputs, buttons, cards). Precision feel — nothing is pill-shaped.

### Breakpoints
- `≥ 640px`: side padding → 32px; prompt lead → 27px; capture body gets more top padding.
- `≤ 380px`: log row collapses the timestamp to its own line; teaching rows tighten their label column.

---

## Motion

Functional only. Each animation marks a state change; nothing loops for decoration.

- `--ease: cubic-bezier(0.2, 0.6, 0.2, 1)` everywhere.
- **Needle travel**: `left` transition, **0.5s**. The single signature motion — the reading landing on the scale.
- **Reading sweep**: a ~0.62s indeterminate sweep along the axis line during the ~460ms `reading` state, then the needle appears and travels.
- **View rise**: result and expanded log content rise in over **0.4s** — **transform only** (`translateY(7px) → 0`), never opacity. (Opacity entrances were deliberately removed: a paused compositor could otherwise freeze content at `opacity: 0`.)
- **Hover / color shifts**: 0.15s.
- `@media (prefers-reduced-motion: reduce)`: all durations collapse to ~0.

---

## The axis instrument (shared)

One horizontal scale, reused on result, history (drift gauge), and the home readout. This repetition is the product's identity — keep it a single component.

- Three **stops** at 0% / 50% / 100% → Direct / Delegate / Defer. Labels in mono below, left/center/right aligned. The active stop's label brightens to `--fg`; others are `--fg-faint`.
- **Ticks**: 1px vertical marks, 9px tall and `--line-strong` when active, 7px and `--line` when dim.
- **Needle** (the reading): a **2px × 22px vertical line**, `--fg`, no fill shape, no color. It is a geometric weight indicator, not a dot or diamond. Travels via `left`.
- **Ghost needle** (all-time average, history only): 1px × 14px, `--fg-faint`, sits behind the recent-average needle so drift is visible as the gap between them.
- **Position math**: `pct = clamp((index / 2) * 100, 3, 97)`. A single reading sits exactly on its stop; a running average sits anywhere between. The clamp keeps end-stop needles from clipping the track edges.
- Optional small **counts** under each label (used on the history gauge) in mono, `--fg-faint`.

---

## Voice (copy rules — enforce in implementation)

Dry, specific, reporting. No motivational language, **no exclamation points, no em dashes.** Use periods, colons, and line breaks. Examples shipped in the prototype:

- Capture: "What were you about to hand off?" / "Paste the ask exactly as you would give it to the model. Centaur reads where the thinking goes."
- Definitions: "You hold the thinking. The model is your instrument." / "You hand off a bounded outcome and inspect what returns." / "You outsource the judgment itself. The call stops being yours."
- Corrective (Defer): "Recast it. Keep the call." — followed by a generated rewrite that hands the judgment back to the user.
