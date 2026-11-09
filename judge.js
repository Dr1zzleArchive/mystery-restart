// Fuzzy answer checking for fill-in questions. Shared by the game and tools/ai-pipeline/validate.html.
(function () {
  "use strict";

  // Full-width -> half-width, lower case, drop spaces / punctuation / symbols (incl. "·" "・").
  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\p{P}\p{S}]/gu, "");
  }

  function length(text) {
    return Array.from(text).length;
  }

  // Levenshtein distance over code points (so CJK characters count as one).
  function distance(a, b) {
    const x = Array.from(a);
    const y = Array.from(b);
    let prev = [];
    for (let j = 0; j <= y.length; j++) prev[j] = j;
    for (let i = 1; i <= x.length; i++) {
      const cur = [i];
      for (let j = 1; j <= y.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[y.length];
  }

  // How many wrong characters an answer of this length tolerates.
  function tolerance(len) {
    if (len <= 2) return 0;
    if (len <= 5) return 1;
    return Math.floor(len / 4);
  }

  // answer: { text, aliases? }; forbidden: other options' names, so "list every suspect" doesn't pass.
  // Returns "empty" | "correct" | "close" | "wrong".
  function check(input, answer, forbidden) {
    const text = normalize(input);
    if (!text) return "empty";
    const candidates = [answer.text].concat(answer.aliases || []).map(normalize).filter(Boolean);
    if (candidates.indexOf(text) >= 0) return "correct";

    const blocked = (forbidden || []).map(normalize).filter(function (f) {
      return f && candidates.every(function (c) { return c.indexOf(f) < 0 && f.indexOf(c) < 0; });
    });
    if (blocked.some(function (f) { return text.indexOf(f) >= 0; })) return "wrong";

    // A sentence that contains the answer, e.g. "我觉得是斯台普顿".
    if (candidates.some(function (c) { return length(c) >= 2 && text.indexOf(c) >= 0; })) return "correct";

    // Typos are measured against the main answer and its longer aliases only:
    // short aliases like "磷" would otherwise let unrelated two-character words through.
    let close = false;
    for (let i = 0; i < candidates.length; i++) {
      const len = length(candidates[i]);
      if (len < 3) continue;
      const d = distance(text, candidates[i]);
      if (d <= tolerance(len)) return "correct";
      if (d <= tolerance(len) + 1 && d <= len / 2) close = true;
    }
    return close ? "close" : "wrong";
  }

  window.Judge = { normalize: normalize, distance: distance, check: check };
})();
