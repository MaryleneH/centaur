# Centaur — Components & Logic

Two parts: (1) the UI components and their specs, (2) the product logic — the classifier and the drift math. **The logic is the real specification.** Re-implement it faithfully; the prototype's `classifier.js` and `store.js` are the canonical reference.

---

# Part 1 — UI components

All components are monochrome and theme-driven. Class names below match `prototype/styles.css`.

## Header (`.header`)
Sticky, 52px, translucent bg with `blur(10px)`, 1px `--line-soft` bottom border.
- **Left**: wordmark button (`.wordmark`) — 6px filled dot + `CENTAUR`, mono 12.5/500, tracking 0.34em. Returns to Capture.
- **Right** (`.header-right`): nav (`.nav`) with two items `Capture` / `Log` (mono 11, UPPERCASE, tracking 0.12em; active = `--fg`, inactive = `--fg-faint`, hover = `--fg-dim`), then a 34px square icon button (`.icon-btn`) toggling theme (sun in dark, moon in light; 15px inline SVG, 1.6 stroke). Result view keeps the `Capture` nav item active.

## Primary button (`.btn.btn-primary`)
Full width, min-height **56px**, radius 3px, mono 13/500, UPPERCASE, tracking 0.1em. Fill `--inv-bg`, text `--inv-fg`. Hover `opacity: 0.88`. Disabled `opacity: 0.32`. Optional trailing `.kbd` hint ("⌘↵", 10px, not uppercased). On Capture it is wrapped in `.capture-actions` — `position: sticky; bottom: 0` with a bottom-up bg gradient and `env(safe-area-inset-bottom)` padding, so it stays thumb-reachable.

## Ghost button (`.btn.btn-ghost`)
Transparent, 1px `--line` border, text `--fg-dim`. Hover → text `--fg`, border `--line-strong`. Used in the result action row (`.btn-row`, two buttons side by side, `flex: 1`).

## Capture field (`.capture-field` + `.capture-input`)
1px `--line` border, radius 3px, `--surface` fill; `:focus-within` → border `--line-strong`. Textarea: min-height 132px, no resize, font 16px (iOS-zoom floor), padding `16px 16px 40px`. Placeholder `--fg-faint`. A `.field-meta` chip (mono 10.5, `--fg-faint`) sits bottom-left and reads `INPUT` / `<n> CH` / `READING`.

## Teaching strip (`.teach`)
First-run definitions. Rows (`.teach-row`) are a `92px 1fr` grid, 16px gap, separated by `--line-soft` hairlines. Term in mono 12/500 UPPERCASE `--fg`; definition in sans 14/1.5 `--fg-dim`. Three rows: Direct / Delegate / Defer.

## Running-position readout (`.readout`)
Home screen, shown once history exists (replaces the teaching strip). A `--surface` card (button) with a top row of two `.label`s ("Running position" / "<n> readings"), the **Axis** (recent-avg needle + all-time ghost), and a one-line note (`.readout-note`, with the trend phrase bolded). Tapping it opens the Log.

## Axis (`.axis`) — the instrument
See `DESIGN_SYSTEM.md` → "The axis instrument" for full geometry. Props in the prototype:
- `marker` (0–100 | null) — needle position percent.
- `ghost` (0–100 | null) — faint second needle (all-time average).
- `active` (0|1|2) — brighten one stop's label + tick (single readings).
- `counts` ({direct,delegate,defer}) — small counts under labels (history gauge).
- `reading` (bool) — show the indeterminate sweep, hide needles.

## Result sections (`.section`)
Hairline-separated blocks, 22px vertical padding, each led by a `.label`.
- **Verdict top** (`.verdict-top`): flex row, top-aligned. Left = task echo (`.task-echo`, sans 17). Right = `.verdict-mark`: category (`.verdict-name`, mono 21/500) + confidence (`.verdict-conf`, mono 12 `--fg-dim`, with a small uppercase "conf" prefix).
- **Axis block**: the Axis (needle on the active stop) + `.axis-caption` (the plain-language gloss, centered, `--fg-dim`).
- **Reading**: `.rationale` (sans 15.5) + `.signals` list. Each `.signal` row: a `.signal-quote` chip (mono 12.5 on `--surface-2`, 1px `--line-soft`, radius 2px) showing the user's matched phrase, with the matched category (`.signal-cat`, mono 10 `--fg-faint`) pushed to the right. Cap at 6 signals.
- **Corrective**: `.corrective-head` (mono 14/500) + `.corrective-body` (sans 14.5 `--fg-dim`). For Defer, a `.recast` card: a bar ("Recast the ask" label + Copy button) over `.recast-body` (the rewritten ask).

## Drift card (`.drift`) — history hero
`--surface`, 1px `--line`, radius 3px, padding `28px 24px 26px`, `margin-bottom: 40px`.
- `.drift-hero`: `.drift-num` (mono 64/500, LH 0.86, tracking -0.03em) with a 26px `--fg-dim` `%`, then `.drift-num-label` (mono 11 UPPERCASE `--fg-faint`) reading "of handoffs deferred".
- `.drift-sentence`: sans 15.5, `--fg`, max-width 36ch — the single trend sentence.
- `.drift-gauge`: top hairline + the Axis (recent needle, ghost, counts) as a quiet footer.

## Log list (`.log-list` / `.log-item`)
Rows separated by `--line-soft`, 19px vertical padding. Collapsed row (`.log-item-top`): `78px 1fr auto` grid — category (mono 11/500 UPPERCASE `--fg`), truncated task text (`--fg-dim`, ellipsis), relative time (mono 10.5 `--fg-faint`). Tap toggles `.open`: text un-truncates and `.log-detail` rises in (Axis + rationale + corrective + recast + a "Delete reading" button). One row open at a time. At ≤380px the timestamp wraps to its own line and the detail loses its left indent.

---

# Part 2 — Product logic (the spec)

## Axis encoding
`direct → index 0`, `delegate → 1`, `defer → 2`. Left = user holds the thinking; right = user outsources judgment. Everything (verdict position, running average, drift) is expressed on this 0–2 axis.

## Classifier — `CentaurClassify(text) → result`

Local, deterministic, offline. **No network, no model call.** Three signal tables of case-insensitive regexes are matched against the lowercased input; the matched substring is quoted back verbatim as evidence.

### Signals (abbreviated — see `classifier.js` for the full lists)
- **DIRECT** (user retains cognition): `help me (think|understand|reason|work|figure|see)`, `think (this/it) through`, `check my …`, `review my (reasoning|logic|…)`, `what am i missing`, `poke holes`, `pressure-test`, `stress-test`, `critique`, `devil's advocate`, `walk/talk me through`, `so i understand`, `teach me`, `explain (how|why|…)`, `why (does|is|…)`, `am i (right|wrong|missing)`, `where (am i|is my)`, …
- **DELEGATE** (bounded, inspectable output): `draft a/the/me`, `write a/the/up`, `summarize`, `outline`, `format`, `convert`, `translate`, `rewrite`, `clean up`, `generate`, `make a/an/me`, `create a/an`, `turn this into`, `extract`, `proofread`, `edit this/my`, `reword`, `shorten`, `expand on`, `compile`, `list out`, `bullet`, …
- **DEFER** (judgment outsourced): `should i/we`, `what should (i/we)`, `what do you think`, `which (one|option|…)`, `decide (if|whether|…)`, `make the (call|decision)`, `choose/pick …`, `is it worth`, `worth (it|doing|…)`, `recommend`, `advise`, `your (opinion|take|call)`, `what's best`, `best (option|approach|…)`, `tell me whether`, `what would you do`, `go with`, `prioritize these`, `figure out (if|whether|…)`, `vet`, `sign off`, `just (handle|deal with) it`, …

### Scoring & selection
1. Weighted hits: **DIRECT = 3, DEFER = 3, DELEGATE = 1.5** per matched signal (deduplicated, and a phrase fully contained in a longer matched phrase of the same category is dropped — e.g. `decide` is removed when `decide whether` also matched).
2. Winner = highest score. Tie-break order **defer > direct > delegate** (surface the risk when genuinely mixed). In practice ties are rare because Direct phrasing scores high on its own — e.g. "help me think through whether I should X" lands **Direct** because the thinking-retention language outscores any deferral.
3. **No signals at all** → fall back to **Delegate**, confidence `low`, with the "no judgment language detected" rationale (a bare deliverable reads as a bounded task; the corrective tells the user to define the check).

### Confidence
- `high` — top score ≥ 3 **and** margin over the runner-up ≥ 3.
- `fair` — margin ≥ 1.5.
- `low` — otherwise, or the no-signal fallback.

### Evidence
Winner's matched phrases first, then any cross-current phrases from the other categories (honest reporting that competing signals were present). Each carries its category tag. Rendered as quote chips; capped at 6.

### Corrective (per category)
- **Direct** — head "Hold position." Keep the model on inputs and counterarguments, not conclusions. *No recast.*
- **Delegate** — head "Define the check first." Name what would make the output wrong before reading it.
- **Defer** — head "Recast it. Keep the call." Plus a generated **recast** (below).
- **No-signal fallback** — head "Set the boundary." Name the spec and the check; reclassify if you are asking it to make a call.

### Recast generator (Defer only) — `buildRecast(text)`
Pattern-matches the input and returns a rewrite that hands the judgment back:
- `should i/we | decide if/whether | is it worth | make the call | figure out if/whether` → *"Give me the strongest case for and the strongest case against. State the assumptions each side depends on. I will decide."*
- `what do you think | your opinion/take/call | what would you do | tell me what to` → *"Lay out the considerations on each side, ranked by what matters most. Hold your recommendation."*
- `recommend | best … | which one/option | go with | choose | pick` → *"List the options with their tradeoffs. Do not rank or recommend. I will choose."*
- `prioritize` → *"Show me each item with its cost and its payoff. Leave the ordering to me."*
- `just handle/deal/take care | sign off | vet` → *"Surface what you would check and what you are unsure about. I will make the final call."*
- fallback → *"Surface the inputs, the tradeoffs, and the unknowns. Leave the conclusion to me."*

### Result shape
```js
{
  category: "direct" | "delegate" | "defer",
  index: 0 | 1 | 2,
  confidence: "high" | "fair" | "low",
  gloss: "You are holding the thinking." | "…handing off a bounded outcome." | "…outsourcing the judgment.",
  rationale: "…",                       // one sentence
  signals: [ { quote: "decide whether", cat: "defer" }, … ],
  corrective: { head, body, recast? }   // recast present only for defer
}
```

A stored **entry** wraps this with `{ id, ts, text, …result }`.

---

## Drift math — `CentaurStore.drift(history) → readout`

`history` is newest-first. Pure function, recomputed each render.

- **counts / pct**: per-category totals and their share of `n`.
- **avg**: mean `index` across all readings (the all-time running position → the ghost needle).
- **recentAvg / priorAvg**: with window `W = min(5, floor(n/2))`, compare the most recent `W` against the previous `W`. `delta = recentAvg − priorAvg`. `recentAvg` drives the solid needle.
- **trend / note** (the single sentence):
  - `n < 3` → `insufficient`: "Not enough readings to show drift. Keep logging."
  - `delta ≥ +0.34` → `toward-defer`: "Drifting toward Defer. Your last W lean more outsourced than the W before."
  - `delta ≤ −0.34` → `sharpening`: "Sharpening. Recent readings hold more of the thinking than they did."
  - else → `steady`: "Holding steady. No meaningful drift across recent readings."

The **history hero number** is `pct.defer` (share of handoffs deferred). The needle positions use `indexToPct(recentAvg ?? avg)` for the solid needle and `indexToPct(avg)` for the ghost.

---

## Persistence — `CentaurStore`
- History → `localStorage["centaur.history.v2"]`, newest-first, capped 500. `add / remove / clear` rewrite the array.
- Theme → `localStorage["centaur.theme.v1"]` (`"dark" | "light"`, default dark). Bootstrapped before first paint by the inline script in `Centaur.html` to prevent a flash.
- All reads are wrapped in try/catch and degrade to empty/default.
