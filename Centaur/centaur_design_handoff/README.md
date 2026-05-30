# Handoff: Centaur

An instrument that reports where the thinking goes when a knowledge worker hands a task to AI. The user pastes the ask they were about to give a model; Centaur classifies it as **Direct** (you hold the thinking), **Delegate** (you hand off a bounded outcome and inspect it), or **Defer** (you outsource the judgment itself), then returns the evidence and a corrective. History accumulates locally and a running ratio surfaces drift toward Defer.

---

## About the design files

The files in `prototype/` are a **design reference built in HTML/CSS/React** — a working prototype that demonstrates the intended look, behavior, and product logic. They are **not** production code to ship as-is.

Your task is to **recreate this design in the target codebase's environment** using its established patterns, component library, and conventions. If there is no environment yet, choose the most appropriate stack (the prototype's logic ports cleanly to any framework — it is plain functions plus local storage). The prototype transpiles JSX in the browser via Babel for previewing; a real build should compile ahead of time.

The product logic, however, **is** the spec. Re-implement `classifier.js` and the drift math in `store.js` faithfully — they define the behavior, see `COMPONENTS.md`.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, motion, and copy. Recreate the UI to match, using the codebase's primitives. Exact values are in `tokens.css`, `tokens.json`, and the per-component specs.

---

## Build constraints (from the brand seed)

- **Instrument, not wellness app.** Reads closer to a terminal than a meditation app, with consumer-product restraint.
- **Negative space is the dominant element.** Density without crowding.
- **Motion is functional only.** It signals a state change. No decoration. Honor `prefers-reduced-motion`.
- **The three categories read as measurements, not judgments.** They are positions on one axis, distinguished by position / type weight / label — **never by color.** The product reports; it does not scold.
- **Copy is sharp, dry, specific.** No motivational language. No exclamation points. No em dashes.
- **Mobile-first.** The capture screen must be one-handed-thumb usable on a phone (primary action pinned to the bottom).
- **No backend, no auth, no accounts.** Static site (built for GitHub Pages). All state in `localStorage`.

---

## The system in one paragraph

One **monochrome** palette, two themes (dark default, light), user-toggleable and persisted. **Geist** for prose, **Geist Mono** for all data, labels, timestamps, and verdicts. The signature element is a single horizontal **axis** — Direct → Delegate → Defer, left = you hold the thinking, right = you outsource judgment — with a thin **needle** (a geometric weight indicator, no fill) that lands on a stop for a single reading and sits between stops for a running average. The same axis appears on every screen, which is what makes the product feel like one instrument.

---

## Screens

Four views, single column, centered, `max-width: 540px`. Full specs in `SCREENS.md`.

1. **Capture** — one prompt, large field, sticky bottom Classify button (⌘/Ctrl+Enter). First run teaches the three terms inline; once history exists, that space becomes a live running-position readout.
2. **Classification (result)** — task echoed at top with the category label aligned beside it; the needle on the axis; a *Reading* section (rationale + the user's own phrases quoted as evidence); a *Corrective* section (with a concrete recast for Defer verdicts).
3. **History / Log** — a hero drift card (big Defer-share number + one trend sentence + a quiet gauge footer) over a breathing list of past readings, each expandable.
4. **Empty state** — the capture and log screens in their first-run form teach the three categories without lecturing.

---

## Interactions & behavior

- **Classify**: validate non-empty → enter a ~520ms `reading` state → run `CentaurClassify(text)` → append entry to history → navigate to result. On the result, the axis shows a brief reading sweep (~460ms) then the needle travels to its stop.
- **Navigation**: client-side view state only (`capture` | `result` | `history`). No router required. Wordmark and nav switch views; every switch resets scroll to top.
- **Theme toggle**: flips `data-theme` on `<html>`, persisted to `localStorage`. Applied before first paint via an inline script to avoid a flash.
- **Log rows**: tap to expand (axis + rationale + corrective + delete). Only one open at a time.
- **Copy recast**: writes the recast string to the clipboard; button reads "Copied" for ~1.4s.
- **Reduced motion**: all animation/transition durations collapse.

## State management

All local. No network.

- `theme`: `"dark" | "light"` → `localStorage["centaur.theme.v1"]`.
- `history`: array of entries, newest-first → `localStorage["centaur.history.v2"]` (capped at 500).
- `view`: `"capture" | "result" | "history"` (in-memory).
- `current`: the entry shown on the result screen (in-memory).
- An **entry**: `{ id, ts, text, category, index, confidence, gloss, rationale, signals[], corrective{} }`. See `COMPONENTS.md`.
- **Drift** is derived from history on every render (pure function `CentaurStore.drift(list)`), never stored.

---

## Files in this bundle

```
centaur_design_handoff/
├─ README.md            ← you are here
├─ DESIGN_SYSTEM.md     ← tokens, type, color rules, motion, the axis instrument
├─ COMPONENTS.md        ← component specs + the classifier & drift logic (the real spec)
├─ SCREENS.md           ← screen-by-screen implementation notes with exact values
├─ tokens.css           ← design system tokens, standalone (CSS custom properties)
├─ tokens.json          ← the same tokens, machine-readable
└─ prototype/           ← the working reference (open Centaur.html)
   ├─ Centaur.html      ← shell: fonts, theme bootstrap, script load order
   ├─ styles.css        ← full stylesheet (tokens + every component)
   ├─ classifier.js     ← CentaurClassify(text) — heuristic engine
   ├─ store.js          ← CentaurStore — localStorage + drift math
   └─ app.jsx           ← React UI (App, Header, Capture, Result, History, Axis)
```

## Assets

- **Fonts**: Geist and Geist Mono, loaded from Google Fonts (`Geist:wght@300;400;500;600` and `Geist+Mono:wght@400;500`). Self-host in production.
- **Icons**: two inline SVGs only (sun / moon for the theme toggle). No icon library, no image assets, no logo file — the wordmark is set type ("CENTAUR" in Geist Mono, `letter-spacing: 0.34em`, with a 6px filled dot).
