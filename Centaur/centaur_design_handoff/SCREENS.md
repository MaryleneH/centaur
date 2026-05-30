# Centaur — Screens

Implementation notes per view. One column, centered, `max-width: 540px`, side padding 24px (32px ≥640px). Header is shared and sticky (see `COMPONENTS.md`). View is client-side state only — `capture | result | history` — no router needed. Every view switch resets scroll to top.

Exact tokens are in `tokens.css` / `tokens.json`; component anatomy is in `COMPONENTS.md`.

---

## 1. Capture  (`view === "capture"`)

The home and primary surface. Must be one-handed-thumb usable.

**Layout** — a flex column filling `100dvh − header`. The body (`.capture-body`) is vertically centered with `justify-content: center` and a ~22px gap; the action button is pinned to the bottom.

**Top to bottom:**
1. **Prompt** — lead "What were you about to hand off?" (sans 23, max-width 22ch, balanced) + sub "Paste the ask exactly as you would give it to the model. Centaur reads where the thinking goes." (sans 13.5 `--fg-dim`).
2. **Field** — `.capture-field` wrapping the textarea + the `INPUT / <n> CH / READING` meta chip. Placeholder: *"e.g. Draft a reply to the vendor and decide whether we should accept their terms."*
3. **Conditional middle:**
   - **First run (history empty)** → the **teaching strip**: three definition rows (Direct / Delegate / Defer). This is the empty-state teaching surface — no separate screen.
   - **Has history** → the **running-position readout** card (Axis with recent + ghost needles, a bolded trend line, "<n> readings"). Tapping it opens the Log.
4. **Action** (`.capture-actions`, sticky bottom) — primary "Classify" button with a "⌘↵" hint. Disabled while empty or during `reading`; label becomes "Reading" mid-classify.

**Behavior**
- Submit on click or ⌘/Ctrl+Enter.
- On submit: set `phase = "reading"` (meta chip → READING, textarea disabled, button → "Reading") → after ~520ms run `CentaurClassify`, append the entry, set it as `current`, switch to `result`, scroll top.
- The 16px input font is intentional (prevents iOS zoom-on-focus). Keep the button inside the safe-area inset.

**Responsive** — ≥640px: prompt lead → 27px, more top padding. The sticky button keeps the field reachable on short viewports.

---

## 2. Classification / Result  (`view === "result"`)

Reports the verdict as a measurement. Reads top-down: *what you asked → where it landed → why → what to do.*

**Top to bottom:**
1. **Verdict top** (`.verdict-top`, flex, top-aligned) — the **task echo** (the user's own words, sans 17) on the left; on the right, top-aligned, the **category** (mono 21, e.g. "Defer") with **confidence** beneath it ("conf · high"). The task is the anchor; the category is a quiet readout beside it — deliberately *not* a big stamp.
2. **Axis block** — the Axis with the needle on the active stop (active label + tick brightened) and the plain-language **gloss** as a centered caption ("You are outsourcing the judgment.").
   - **Entrance**: mount in `reading` state for ~460ms (sweep animation, no needle) → then render the needle, which travels to its stop over 0.5s.
3. **Reading section** — the one-line **rationale**, then the **evidence**: the user's matched phrases as quote chips, each tagged with the category it signalled (winner phrases first, cross-currents after). If there were no signal phrases, a single dim line explains the classification rested on the absence of judgment language.
4. **Corrective section** — head + body. For **Defer** only, a **recast card** with a Copy button containing the rewritten ask that hands the judgment back to the user.
5. **Actions** (`.btn-row`) — "View log" (ghost) and "New capture" (primary). "New capture" clears `current` and returns to Capture.

**Notes**
- The reading is already recorded at classify time (this screen reads from the stored entry), so navigating away loses nothing.
- Keep every separator a `--line-soft` hairline; no shadows, no card around the whole result.

---

## 3. History / Log  (`view === "history"`)

The drift card is the highest-value element on the page and must dominate; the log breathes underneath it.

**Top to bottom:**
1. **Header row** — `.label` "Drift" + count "<n> readings".
2. **Drift hero card** (`.drift`) — the focal point:
   - **Hero number**: `pct.defer` at 64px mono with a small `%`, labelled "of handoffs deferred".
   - **One sentence**: the trend note (`toward-defer` / `sharpening` / `steady` / `insufficient`).
   - **Gauge footer**: below a hairline, the Axis with the recent-average needle, the all-time **ghost** needle, and small per-category counts under the labels. Drift is legible as the gap between the two needles.
   - 40px margin below the card separates it from the log.
3. **Readings header** — `.label` "Readings".
4. **Log list** — newest-first rows: category / truncated task / relative time. Tap to expand (Axis + rationale + corrective + recast + "Delete reading"). One open at a time; delete updates history immediately and recomputes drift.

**Empty state (no readings)** — replace the card and list with: a single explanatory line ("No readings yet. Every handoff you classify lands here, and the running position shows whether you are drifting toward Defer."), the three-term teaching strip, and a "Capture a handoff" primary button back to Capture.

**Responsive** — ≤380px: the log timestamp wraps to its own line and `.log-detail` drops its left indent so detail content uses full width.

---

## 4. Empty states (summary)

Centaur has no standalone onboarding screen — the empty states *are* the teaching, embedded in the two real surfaces:
- **Capture, first run**: teaching strip of the three definitions sits under the input.
- **Log, no readings**: short framing line + teaching strip + a button back to Capture.

Both teach the three categories without lecturing, then get out of the way once the user has data. Once history exists, the Capture teaching strip is replaced by the live running-position readout, and the Log shows the drift hero.

---

## Cross-screen invariants

- **One instrument.** The same Axis component appears on Capture (readout), Result, and History. Do not fork its visual language per screen.
- **Monochrome.** No category colors anywhere. Differentiate by axis position, type weight, and label only.
- **Motion is state change.** Needle travel, the reading sweep, transform-only view rises. Nothing loops.
- **Voice.** Dry, specific, reporting. No exclamation points, no em dashes, no motivational language.
- **Local only.** Every screen reads/writes `localStorage`; there is no network call in the entire app.
