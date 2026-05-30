/* ============================================================
   CENTAUR — store
   localStorage history + theme + drift math. No backend.
   ============================================================ */
(function () {
  "use strict";

  var HKEY = "centaur.history.v2";
  var TKEY = "centaur.theme.v1";

  function read() {
    try {
      var raw = localStorage.getItem(HKEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function write(list) {
    try { localStorage.setItem(HKEY, JSON.stringify(list)); } catch (e) {}
  }

  // history stored newest-first
  function add(entry) {
    var list = read();
    list.unshift(entry);
    if (list.length > 500) list = list.slice(0, 500);
    write(list);
    return list;
  }

  function remove(id) {
    var list = read().filter(function (e) { return e.id !== id; });
    write(list);
    return list;
  }

  function clear() { write([]); return []; }

  function getTheme() {
    try {
      var t = localStorage.getItem(TKEY);
      if (t === "light" || t === "dark") return t;
    } catch (e) {}
    return "dark";
  }
  function setTheme(t) {
    try { localStorage.setItem(TKEY, t); } catch (e) {}
  }

  // ----- drift math -----
  // list is newest-first. index: direct 0, delegate 1, defer 2.
  function drift(list) {
    var n = list.length;
    var counts = { direct: 0, delegate: 0, defer: 0 };
    list.forEach(function (e) { counts[e.category] = (counts[e.category] || 0) + 1; });

    var avg = n ? list.reduce(function (s, e) { return s + e.index; }, 0) / n : 1;

    // recent vs prior window
    var W = Math.min(5, Math.floor(n / 2));
    var recentAvg = null, priorAvg = null, delta = 0;
    if (n >= 4 && W >= 2) {
      var recent = list.slice(0, W);
      var prior = list.slice(W, W * 2);
      recentAvg = recent.reduce(function (s, e) { return s + e.index; }, 0) / recent.length;
      priorAvg = prior.reduce(function (s, e) { return s + e.index; }, 0) / prior.length;
      delta = recentAvg - priorAvg;
    }

    var trend, note;
    if (n < 3) {
      trend = "insufficient";
      note = "Not enough readings to show drift. Keep logging.";
    } else if (recentAvg === null) {
      trend = "steady";
      note = "Holding. Most recent readings sit at " + label(Math.round(avg)) + ".";
    } else if (delta >= 0.34) {
      trend = "toward-defer";
      note = "Drifting toward Defer. Your last " + W + " lean more outsourced than the " + W + " before.";
    } else if (delta <= -0.34) {
      trend = "sharpening";
      note = "Sharpening. Recent readings hold more of the thinking than they did.";
    } else {
      trend = "steady";
      note = "Holding steady. No meaningful drift across recent readings.";
    }

    var pct = {
      direct: n ? Math.round((counts.direct / n) * 100) : 0,
      delegate: n ? Math.round((counts.delegate / n) * 100) : 0,
      defer: n ? Math.round((counts.defer / n) * 100) : 0
    };

    return {
      n: n, counts: counts, pct: pct,
      avg: avg, recentAvg: recentAvg, priorAvg: priorAvg,
      delta: delta, trend: trend, note: note
    };
  }

  function label(i) {
    return ["Direct", "Delegate", "Defer"][i] || "Delegate";
  }

  window.CentaurStore = {
    read: read, add: add, remove: remove, clear: clear,
    getTheme: getTheme, setTheme: setTheme, drift: drift, label: label
  };
})();
