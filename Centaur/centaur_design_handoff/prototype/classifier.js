/* ============================================================
   CENTAUR — classifier
   Local, deterministic heuristic. No network.

   Axis:  DIRECT (0)  ->  DELEGATE (1)  ->  DEFER (2)
   Left   = you hold the thinking.
   Right  = you outsource the judgment.

   Output:
     { category, index, confidence, gloss,
       signals: [{ quote, cat }],
       rationale, corrective: { head, body, recast } }
   ============================================================ */
(function () {
  "use strict";

  // Each signal: a regex matched against the lowercased task.
  // The matched substring is quoted back as evidence.
  var SIGNALS = {
    direct: [
      /help me (?:think|understand|reason|work|figure|see)/,
      /think (?:this |it )?through/,
      /think out loud/,
      /check my (?:reasoning|logic|work|math|thinking|assumptions|argument)?/,
      /review my (?:reasoning|logic|argument|thinking|math|plan|approach|draft)/,
      /what am i missing/,
      /what(?:'s| is) wrong with my/,
      /poke holes/,
      /pressure[- ]?test/,
      /stress[- ]?test/,
      /\bcritique\b/,
      /devil'?s advocate/,
      /argue (?:against|the other|both)/,
      /counter ?argument/,
      /sounding board/,
      /walk me through/,
      /talk me through/,
      /so i (?:can )?understand/,
      /teach me/,
      /\bexplain (?:how|why|the|this|what|to me)/,
      /why (?:does|is|do|are|did|would|should)/,
      /how (?:does|do|would) (?:this|that|it|i)/,
      /am i (?:right|wrong|missing|on track|off)/,
      /where (?:am i|is my|did i)/,
      /is my (?:reasoning|logic|thinking|read|take)/
    ],
    delegate: [
      /\bdraft (?:a|an|the|me|up)\b/,
      /write (?:a|an|the|me|up|some)\b/,
      /summari[sz]e/,
      /\boutline\b/,
      /\bformat\b/,
      /reformat/,
      /\bconvert\b/,
      /translate/,
      /rewrite/,
      /clean (?:this |it )?up/,
      /tidy (?:this |it )?up/,
      /\bgenerate\b/,
      /make (?:a|an|me) /,
      /create (?:a|an|the) /,
      /turn (?:this|these|it|that) into/,
      /\bextract\b/,
      /proofread/,
      /\bedit (?:this|my|the)\b/,
      /reword/,
      /shorten/,
      /expand (?:this|the|on)/,
      /\bcompile\b/,
      /put (?:this|it|these) into a (?:table|list)/,
      /\blist out\b/,
      /\bbullet/
    ],
    defer: [
      /should i\b/,
      /should we\b/,
      /what should (?:i|we)/,
      /what do you think/,
      /which (?:one|option|approach|way|is better|should)/,
      /\bdecide (?:if|whether|between|on|for)\b/,
      /\bdecide\b/,
      /make the (?:call|decision|choice)/,
      /choose (?:for|between|the|one)/,
      /pick (?:one|the|for|between)/,
      /is it worth/,
      /worth (?:it|doing|pursuing|the)/,
      /\brecommend/,
      /\badvise\b/,
      /your (?:opinion|take|call|advice|recommendation)/,
      /what(?:'s| is) best/,
      /best (?:option|approach|choice|way|move|one|path)/,
      /tell me whether/,
      /tell me what to/,
      /what would you do/,
      /go with/,
      /prioriti[sz]e (?:these|the|them|for)/,
      /figure out (?:if|whether|which|what to)/,
      /\bvet\b/,
      /sign off/,
      /just (?:handle|deal with|take care of) (?:it|this)/
    ]
  };

  var WEIGHT = { direct: 3, defer: 3, delegate: 1.5 };

  var GLOSS = {
    direct:   "You are holding the thinking.",
    delegate: "You are handing off a bounded outcome.",
    defer:    "You are outsourcing the judgment."
  };

  var RATIONALE = {
    direct:
      "The ask keeps the reasoning with you. The model is assisting, not concluding.",
    delegate:
      "The ask is a bounded output you can inspect. You set the spec; you check the result.",
    defer:
      "The ask hands the conclusion to the model. The judgment, not just the work, is being outsourced.",
    none:
      "No judgment language detected. Reads as a bounded task. Confirm you will inspect what comes back."
  };

  var CORRECTIVE = {
    direct: {
      head: "Hold position.",
      body: "You are doing the thinking. Keep the model on inputs and counterarguments, not on conclusions."
    },
    delegate: {
      head: "Define the check first.",
      body: "Before you read the output, name what would make it wrong. Inspect against that test, not against the relief of being done."
    },
    defer: {
      head: "Recast it. Keep the call.",
      body: "You are outsourcing the decision. Rewrite the ask so the model surfaces the inputs and you make the judgment."
    },
    none: {
      head: "Set the boundary.",
      body: "Name the spec and the check before you send it. If you are asking the model to make a call, reclassify."
    }
  };

  function buildRecast(text) {
    var t = text.toLowerCase();
    if (/should (?:i|we)|decide (?:if|whether)|is it worth|worth it|make the (?:call|decision)|figure out (?:if|whether)/.test(t))
      return "Give me the strongest case for and the strongest case against. State the assumptions each side depends on. I will decide.";
    if (/what do you think|your (?:opinion|take|call|advice)|what would you do|tell me what to/.test(t))
      return "Lay out the considerations on each side, ranked by what matters most. Hold your recommendation.";
    if (/recommend|best (?:option|approach|choice|way|move|path)|which (?:one|option|approach)|go with|choose|pick/.test(t))
      return "List the options with their tradeoffs. Do not rank or recommend. I will choose.";
    if (/prioriti[sz]e/.test(t))
      return "Show me each item with its cost and its payoff. Leave the ordering to me.";
    if (/just (?:handle|deal|take care)|sign off|\bvet\b/.test(t))
      return "Surface what you would check and what you are unsure about. I will make the final call.";
    return "Surface the inputs, the tradeoffs, and the unknowns. Leave the conclusion to me.";
  }

  function gather(text) {
    var t = text.toLowerCase();
    var found = { direct: [], delegate: [], defer: [] };
    var score = { direct: 0, delegate: 0, defer: 0 };
    var seen = {};

    Object.keys(SIGNALS).forEach(function (cat) {
      SIGNALS[cat].forEach(function (re) {
        var m = re.exec(t);
        if (m) {
          var quote = m[0].trim();
          var key = cat + "::" + quote;
          if (!seen[key]) {
            seen[key] = true;
            found[cat].push(quote);
            score[cat] += WEIGHT[cat];
          }
        }
      });
    });
    Object.keys(found).forEach(function (cat) {
      var arr = found[cat];
      found[cat] = arr.filter(function (q) {
        return !arr.some(function (o) {
          return o !== q && o.indexOf(q) !== -1 && o.length > q.length;
        });
      });
    });

    return { found: found, score: score };
  }

  function classify(text) {
    text = (text || "").trim();
    var g = gather(text);
    var score = g.score, found = g.found;

    var order = ["direct", "delegate", "defer"];
    var total = score.direct + score.delegate + score.defer;

    var category, isNone = false;
    if (total === 0) {
      category = "delegate";
      isNone = true;
    } else {
      // winner by score; tie-break surfaces risk: defer > direct > delegate
      var tie = ["defer", "direct", "delegate"];
      category = tie[0];
      var best = -1;
      tie.forEach(function (c) {
        if (score[c] > best) { best = score[c]; category = c; }
      });
    }

    var index = { direct: 0, delegate: 1, defer: 2 }[category];

    // confidence from margin between top two scores
    var sorted = order.map(function (c) { return score[c]; }).sort(function (a, b) { return b - a; });
    var margin = sorted[0] - sorted[1];
    var confidence;
    if (isNone) confidence = "low";
    else if (sorted[0] >= 3 && margin >= 3) confidence = "high";
    else if (margin >= 1.5) confidence = "fair";
    else confidence = "low";

    // evidence: winner signals first, then crosscurrents from other cats
    var signals = [];
    found[category].forEach(function (q) { signals.push({ quote: q, cat: category }); });
    order.forEach(function (c) {
      if (c === category) return;
      found[c].forEach(function (q) { signals.push({ quote: q, cat: c }); });
    });

    var corr = Object.assign({}, isNone ? CORRECTIVE.none : CORRECTIVE[category]);
    if (category === "defer") corr.recast = buildRecast(text);

    return {
      category: category,
      index: index,
      confidence: confidence,
      gloss: GLOSS[category],
      rationale: isNone ? RATIONALE.none : RATIONALE[category],
      signals: signals
    , corrective: corr
    };
  }

  window.CentaurClassify = classify;
  window.CentaurMeta = {
    labels: { direct: "Direct", delegate: "Delegate", defer: "Defer" },
    gloss: GLOSS
  };
})();
