/* ============================================================
   CENTAUR — app
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

const LABELS = { direct: "Direct", delegate: "Delegate", defer: "Defer" };
const POS = [0, 50, 100]; // percent positions for the three stops

function clampPct(p) { return Math.max(3, Math.min(97, p)); }
function indexToPct(i) { return clampPct((i / 2) * 100); }

function relTime(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const day = Math.floor(h / 24);
  if (day < 7) return day + "d";
  const date = new Date(ts);
  return (date.getMonth() + 1) + "/" + date.getDate();
}

/* ---------- Icons ---------- */
function Sun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function Moon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />
    </svg>
  );
}

/* ---------- Axis instrument ---------- */
// marker: percent (0-100) or null. ghost: optional second faint marker percent.
// active: index 0/1/2 to brighten a label (single reading). counts: optional.
function Axis({ marker, ghost, active, counts, reading }) {
  const labelEls = ["Direct", "Delegate", "Defer"].map((name, i) => {
    const cls = "axis-label" + (i === 1 ? " mid" : i === 2 ? " end" : "") + (active === i ? " on" : "");
    return (
      <div key={name} className={cls}>
        {name}
        {counts ? <span className="ct">{counts[["direct", "delegate", "defer"][i]]}</span> : null}
      </div>
    );
  });

  return (
    <div className="axis">
      <div className="axis-track-wrap">
        <div className="axis-line" />
        {POS.map((p, i) => (
          <div key={i} className={"axis-tick" + (active === i ? "" : " dim")} style={{ left: p + "%" }} />
        ))}
        {reading ? <div className="axis-reading" /> : null}
        {ghost != null && !reading ? (
          <div className="axis-marker ghost" style={{ left: ghost + "%" }} />
        ) : null}
        {marker != null && !reading ? (
          <div className="axis-marker" style={{ left: marker + "%" }} />
        ) : null}
      </div>
      <div className="axis-labels">{labelEls}</div>
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ view, go, theme, toggleTheme }) {
  return (
    <header className="header">
      <button className="wordmark" onClick={() => go("capture")} aria-label="Centaur home">
        <span className="dot" />CENTAUR
      </button>
      <div className="header-right">
        <nav className="nav">
          <button className={"nav-item" + (view === "capture" || view === "result" ? " active" : "")} onClick={() => go("capture")}>Capture</button>
          <button className={"nav-item" + (view === "history" ? " active" : "")} onClick={() => go("history")}>Log</button>
        </nav>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </div>
    </header>
  );
}

/* ---------- Capture ---------- */
function Capture({ go, onClassify, history, driftData }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | reading
  const ref = useRef(null);

  const empty = history.length === 0;
  const canGo = text.trim().length > 0 && phase === "idle";

  const run = useCallback(() => {
    if (text.trim().length === 0) return;
    setPhase("reading");
    const result = window.CentaurClassify(text);
    window.setTimeout(() => {
      onClassify(text.trim(), result);
      setPhase("idle");
    }, 520);
  }, [text, onClassify]);

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
  };

  return (
    <div className="capture">
      <div className="capture-body">
        <div>
          <div className="prompt-lead">What were you about to hand off?</div>
          <div className="prompt-sub">Paste the ask exactly as you would give it to the model. Centaur reads where the thinking goes.</div>
        </div>

        <div className="capture-field">
          <textarea
            ref={ref}
            className="capture-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="e.g. Draft a reply to the vendor and decide whether we should accept their terms."
            spellCheck="false"
            disabled={phase === "reading"}
          />
          <div className="field-meta">{phase === "reading" ? "READING" : text.trim() ? text.trim().length + " CH" : "INPUT"}</div>
        </div>

        {empty ? (
          <div className="teach">
            <div className="teach-row">
              <div className="teach-term">Direct</div>
              <div className="teach-def">You hold the thinking. The model is your instrument.</div>
            </div>
            <div className="teach-row">
              <div className="teach-term">Delegate</div>
              <div className="teach-def">You hand off a bounded outcome and inspect what returns.</div>
            </div>
            <div className="teach-row">
              <div className="teach-term">Defer</div>
              <div className="teach-def">You outsource the judgment itself. The call stops being yours.</div>
            </div>
          </div>
        ) : (
          <button className="readout" onClick={() => go("history")}>
            <div className="readout-top">
              <span className="label">Running position</span>
              <span className="label">{history.length} {history.length === 1 ? "reading" : "readings"}</span>
            </div>
            <Axis
              marker={indexToPct(driftData.recentAvg != null ? driftData.recentAvg : driftData.avg)}
              ghost={driftData.recentAvg != null ? indexToPct(driftData.avg) : null}
            />
            <div className="readout-note">{driftNote(driftData)}</div>
          </button>
        )}
      </div>

      <div className="capture-actions">
        <button className="btn btn-primary" onClick={run} disabled={!canGo}>
          {phase === "reading" ? "Reading" : (<><span>Classify</span><span className="kbd">⌘↵</span></>)}
        </button>
      </div>
    </div>
  );
}

function driftNote(d) {
  if (d.trend === "toward-defer") return <span><b>Drifting toward Defer.</b> Recent handoffs lean more outsourced.</span>;
  if (d.trend === "sharpening") return <span><b>Sharpening.</b> Recent handoffs hold more of the thinking.</span>;
  if (d.trend === "insufficient") return <span className="faint">Not enough readings to show drift yet.</span>;
  return <span><b>Holding steady.</b> No meaningful drift in recent readings.</span>;
}

/* ---------- Result ---------- */
function Result({ entry, go, onNew }) {
  const [reading, setReading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReading(false), 460);
    return () => window.clearTimeout(t);
  }, [entry.id]);

  const r = entry;
  const c = r.corrective;

  const copyRecast = () => {
    const txt = c.recast || "";
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="result">
      <div className="verdict-top">
        <p className="task-echo">{r.text}</p>
        <div className="verdict-mark">
          <div className="verdict-name">{LABELS[r.category]}</div>
          <div className="verdict-conf"><span>conf</span> {r.confidence}</div>
        </div>
      </div>

      <div className="axis-block">
        <Axis marker={indexToPct(r.index)} active={r.index} reading={reading} />
        <div className="axis-caption">{r.gloss}</div>
      </div>

      <div className="section">
        <span className="section-label label">Reading</span>
        <div className="rationale">{r.rationale}</div>
        {r.signals.length > 0 ? (
          <div className="signals">
            {r.signals.slice(0, 6).map((s, i) => (
              <div className="signal" key={i}>
                <span className="signal-quote">{s.quote}</span>
                <span className="signal-cat">{LABELS[s.cat]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="signals">
            <div className="signal"><span className="faint" style={{ fontSize: "13px" }}>No explicit signal phrases. Classified on absence of judgment language.</span></div>
          </div>
        )}
      </div>

      <div className="section">
        <span className="section-label label">Corrective</span>
        <div className="corrective-head">{c.head}</div>
        <div className="corrective-body">{c.body}</div>
        {c.recast ? (
          <div className="recast">
            <div className="recast-bar">
              <span className="label">Recast the ask</span>
              <button className="copy-btn" onClick={copyRecast}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <div className="recast-body">{c.recast}</div>
          </div>
        ) : null}
      </div>

      <div className="result-actions">
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => go("history")}>View log</button>
          <button className="btn btn-primary" onClick={onNew}>New capture</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- History ---------- */
function History({ history, driftData, onRemove, go }) {
  const [open, setOpen] = useState(null);

  if (history.length === 0) {
    return (
      <div className="history">
        <div className="history-head">
          <span className="label">Log</span>
        </div>
        <div className="empty">
          <div className="empty-line">No readings yet. Every handoff you classify lands here, and the running position shows whether you are drifting toward Defer.</div>
          <div className="teach">
            <div className="teach-row">
              <div className="teach-term">Direct</div>
              <div className="teach-def">You hold the thinking.</div>
            </div>
            <div className="teach-row">
              <div className="teach-term">Delegate</div>
              <div className="teach-def">You hand off a bounded outcome and inspect it.</div>
            </div>
            <div className="teach-row">
              <div className="teach-term">Defer</div>
              <div className="teach-def">You outsource the judgment.</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => go("capture")} style={{ marginTop: "6px" }}>Capture a handoff</button>
        </div>
      </div>
    );
  }

  const d = driftData;

  return (
    <div className="history">
      <div className="history-head">
        <span className="label">Drift</span>
        <span className="count">{d.n} {d.n === 1 ? "reading" : "readings"}</span>
      </div>

      <div className="drift">
        <div className="drift-hero">
          <div className="drift-num">{d.pct.defer}<span className="drift-pct">%</span></div>
          <div className="drift-num-label">of handoffs deferred</div>
        </div>
        <div className="drift-sentence">{d.note}</div>
        <div className="drift-gauge">
          <Axis
            marker={indexToPct(d.recentAvg != null ? d.recentAvg : d.avg)}
            ghost={d.recentAvg != null ? indexToPct(d.avg) : null}
            counts={d.counts}
          />
        </div>
      </div>

      <div className="history-head spaced">
        <span className="label">Readings</span>
      </div>
      <div className="log-list">
        {history.map((e) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id} className={"log-item" + (isOpen ? " open" : "")} onClick={() => setOpen(isOpen ? null : e.id)}>
              <div className="log-item-top">
                <span className="log-cat">{LABELS[e.category]}</span>
                <span className="log-text">{e.text}</span>
                <span className="log-time">{relTime(e.ts)}</span>
              </div>
              {isOpen ? (
                <div className="log-detail" onClick={(ev) => ev.stopPropagation()}>
                  <Axis marker={indexToPct(e.index)} active={e.index} />
                  <div className="rationale">{e.rationale}</div>
                  <div>
                    <div className="corrective-head">{e.corrective.head}</div>
                    <div className="corrective-body">{e.corrective.body}</div>
                  </div>
                  {e.corrective.recast ? (
                    <div className="recast">
                      <div className="recast-bar"><span className="label">Recast</span></div>
                      <div className="recast-body">{e.corrective.recast}</div>
                    </div>
                  ) : null}
                  <button className="log-del" onClick={() => { onRemove(e.id); setOpen(null); }}>Delete reading</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- App ---------- */
function App() {
  const [theme, setTheme] = useState(() => window.CentaurStore.getTheme());
  const [history, setHistory] = useState(() => window.CentaurStore.read());
  const [view, setView] = useState("capture");
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.CentaurStore.setTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const driftData = window.CentaurStore.drift(history);

  const onClassify = useCallback((text, result) => {
    const entry = {
      id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      text: text,
      category: result.category,
      index: result.index,
      confidence: result.confidence,
      gloss: result.gloss,
      rationale: result.rationale,
      signals: result.signals,
      corrective: result.corrective
    };
    const next = window.CentaurStore.add(entry);
    setHistory(next);
    setCurrent(entry);
    setView("result");
    window.scrollTo(0, 0);
  }, []);

  const onRemove = useCallback((id) => {
    setHistory(window.CentaurStore.remove(id));
  }, []);

  const go = useCallback((v) => {
    setView(v);
    window.scrollTo(0, 0);
  }, []);

  const onNew = useCallback(() => {
    setCurrent(null);
    setView("capture");
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="app">
      <Header view={view} go={go} theme={theme} toggleTheme={toggleTheme} />
      <main className="main">
        {view === "capture" ? (
          <Capture go={go} onClassify={onClassify} history={history} driftData={driftData} />
        ) : null}
        {view === "result" && current ? (
          <Result entry={current} go={go} onNew={onNew} />
        ) : null}
        {view === "history" ? (
          <History history={history} driftData={driftData} onRemove={onRemove} go={go} />
        ) : null}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
