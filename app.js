(function () {
  "use strict";

  const SCRIPTS = window.SCRIPTS || [];
  const MASCOT = window.MASCOT || { expressions: {}, reactions: {} };
  const STORAGE_KEY = "murder_restart_save_v3";
  const SETTINGS_KEY = "murder_restart_settings_v1";
  const WELCOME_KEY = "murder_restart_welcome_seen_v1";

  const app = document.getElementById("app");
  const mascotImg = document.getElementById("mascotImg");
  const guideFullbody = document.getElementById("guideFullbody");
  const bubble = document.getElementById("guideBubble");
  const welcomeScreen = document.getElementById("welcomeScreen");
  const welcomeLine = document.getElementById("welcomeLine");
  const welcomeGuide = document.getElementById("welcomeGuide");
  const settingsPanel = document.getElementById("settingsPanel");
  const uiSize = document.getElementById("uiSize");
  const fontStyle = document.getElementById("fontStyle");
  const textSpeed = document.getElementById("textSpeed");
  const voiceToggle = document.getElementById("voiceToggle");
  const voiceStyle = document.getElementById("voiceStyle");
  const voiceVolume = document.getElementById("voiceVolume");
  const voiceVolumeLabel = document.getElementById("voiceVolumeLabel");
  const homeTrigger = document.getElementById("homeTrigger");
  const illustrationBackground = document.getElementById("illustrationBackground");
  const backgroundGallery = document.getElementById("backgroundGallery");
  const backgroundGrid = document.getElementById("backgroundGrid");
  const backgroundViewer = document.getElementById("backgroundViewer");

  const MAX_ATTEMPTS = 3;
  const FILL_LINES = {
    correct: ["对。这个答案，证据会站在你这边。", "没错。看来你没把线索当装饰品。", "正确。继续保持这个状态。"],
    close: ["很接近了。是不是哪个字打错了？", "方向对了，再检查一下写法。", "差一点点。我不扣你机会，再看一眼。"],
    wrong: ["不对。回去翻翻线索背包。", "这个答案，证据不太同意。", "嗯……再想想。别和直觉私奔。"]
  };

  // mode: "easy" = multiple choice, "hard" = fill in the blank with fuzzy checking (judge.js).
  const state = {
    scriptId: null,
    phase: "menu",
    mode: "easy",
    collected: [],
    doneActions: [],
    answers: {},
    attempts: {},
    hints: {},
    results: {},
    score: 0,
    aiChat: [],
    statedDeductions: [],
    closingPlaced: {},
    closingSelected: null,
    closingChecked: false,
    closingSolved: false
  };

  const savedCompleted = new Set();
  const completedHard = new Set();
  const ILLUSTRATIONS = [
    { id: "rainy_street", name: "雨夜来信", src: "assets/backgrounds/rainy_street.webp", position: "50% 42%", achievements: 1, cases: 0 },
    { id: "moonlit_library", name: "月下藏书室", src: "assets/backgrounds/moonlit_library.webp", position: "50% 36%", achievements: 3, cases: 1 },
    { id: "sunlit_library", name: "午后书页", src: "assets/backgrounds/sunlit_library.webp", position: "50% 45%", achievements: 6, cases: "all" },
    { id: "rainy_archive", name: "雨窗旧档", src: "assets/backgrounds/rainy_archive.webp", position: "50% 45%", achievements: 10, cases: "all" },
    { id: "midnight_ball", name: "真相晚宴", src: "assets/backgrounds/midnight_ball.webp", position: "50% 35%", achievements: "all", cases: "all" }
  ];
  const settings = {
    uiSize: "normal",
    fontStyle: "sans",
    theme: "ink",
    textSpeed: "normal",
    achSound: true,
    voice: true,
    voiceStyle: "beep",
    voiceVolume: 60,
    background: "",
    aiBase: "https://api.deepseek.com",
    aiKey: "",
    aiModel: "deepseek-chat",
    proxyUrl: ""
  };

  const lastLine = {};
  let mascotClicks = 0;
  let mascotClickTimer = null;
  let welcomeTimer = null;
  let aiBusy = false;

  const welcomeLines = [
    "你好，我是灰羽。接下来，由我带你把文学作品变成一场推理游戏。",
    "这里不需要先背完原著。观察人物、寻找线索，然后亲自判断真相。",
    "选一个案件开始吧。每本书都会被改造成一段可以参与的故事。"
  ];

  function script() {
    return SCRIPTS.find(function (s) { return s.id === state.scriptId; });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setExpression(expr) {
    mascotImg.src = MASCOT.expressions[expr] || MASCOT.expressions.neutral || "";
    mascotImg.dataset.expr = expr || "neutral";
  }

  function setFullbody(pose) {
    const src = MASCOT.fullbodies && MASCOT.fullbodies[pose];
    if (!src || !guideFullbody) return;
    guideFullbody.src = src;
    guideFullbody.dataset.pose = pose || "idle";
    if (MASCOT.portraits) {
      mascotImg.dataset.pose = pose || "idle";
      mascotImg.src = MASCOT.portraits[pose] || MASCOT.portraits.idle;
    }
  }

  function guide(text, expr, pose) {
    // Typed out with the guide's voice, like every other line of text in the game.
    if (bubble.dataset.text !== text) {
      bubble.dataset.text = text;
      window.Dialogue.typeInto(bubble, text, { voice: "guide" });
    }
    setExpression(expr || "neutral");
    setFullbody(pose || "idle");
  }

  function pickLine(key, lines) {
    // Avoid repeating the same line twice in a row.
    let index = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && index === lastLine[key]) index = (index + 1) % lines.length;
    lastLine[key] = index;
    return lines[index];
  }

  function bounceGuide() {
    const portrait = guideFullbody && guideFullbody.parentElement;
    if (!portrait) return;
    portrait.classList.remove("poked");
    void portrait.offsetWidth;
    portrait.classList.add("poked");
  }

  function pokeMascot() {
    // Clicking repeatedly within a short window escalates the reaction.
    mascotClicks++;
    window.clearTimeout(mascotClickTimer);
    mascotClickTimer = window.setTimeout(function () { mascotClicks = 0; }, 2500);
    bounceGuide();
    if (mascotClicks >= 6) window.Achievements.unlock("poke");
    if (mascotClicks >= 6 && MASCOT.reactions.mascot_spam) react("mascot_spam");
    else if (mascotClicks >= 3 && MASCOT.reactions.mascot_annoyed) react("mascot_annoyed");
    else react("mascot");
  }

  function react(key) {
    const r = MASCOT.reactions[key];
    if (!r || !r.lines || !r.lines.length) return;
    const line = pickLine(key, r.lines);
    const poseByReaction = {
      menu: "idle",
      mascot: "unimpressed",
      mascot_annoyed: "unimpressed",
      mascot_spam: "thinking",
      intro: "idle",
      investigate: "investigate",
      talk: "idle",
      search: "investigate",
      clue_found: "investigate",
      deduce: "thinking",
      answer: "unimpressed",
      ending_perfect: "idle",
      ending_close: "thinking",
      ending_fail: "unimpressed"
    };
    guide(line, r.expr || "neutral", r.fullbody || poseByReaction[key] || "idle");
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      settings.uiSize = saved.uiSize || settings.uiSize;
      settings.fontStyle = saved.fontStyle || settings.fontStyle;
      settings.theme = saved.theme || settings.theme;
      settings.background = typeof saved.background === "string" ? saved.background : "";
      settings.textSpeed = saved.textSpeed || settings.textSpeed;
      if (typeof saved.voice === "boolean") settings.voice = saved.voice;
      if (typeof saved.achSound === "boolean") settings.achSound = saved.achSound;
      if (saved.voiceStyle && window.Dialogue.sounds[saved.voiceStyle]) settings.voiceStyle = saved.voiceStyle;
      if (typeof saved.voiceVolume === "number") settings.voiceVolume = Math.min(100, Math.max(0, saved.voiceVolume));
      if (typeof saved.aiBase === "string") settings.aiBase = saved.aiBase;
      if (typeof saved.aiKey === "string") settings.aiKey = saved.aiKey;
      if (typeof saved.aiModel === "string") settings.aiModel = saved.aiModel;
      if (typeof saved.proxyUrl === "string") settings.proxyUrl = saved.proxyUrl;
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function allCasesCompleted() {
    const availableCases = SCRIPTS.filter(function (s) { return !s.locked; });
    return availableCases.length > 0 && availableCases.every(function (s) { return savedCompleted.has(s.id); });
  }

  function completedCaseCount() {
    return SCRIPTS.filter(function (s) { return !s.locked && savedCompleted.has(s.id); }).length;
  }

  function illustrationUnlocked(art) {
    const achievementReady = art.achievements === "all"
      ? window.Achievements.complete()
      : window.Achievements.count() >= art.achievements;
    const caseReady = art.cases === "all" ? allCasesCompleted() : completedCaseCount() >= art.cases;
    return achievementReady && caseReady;
  }

  function illustrationRequirement(art) {
    const parts = [];
    parts.push(art.achievements === "all" ? "解锁全部成就" : "解锁 " + art.achievements + " 个成就");
    if (art.cases === "all") parts.push("完成全部关卡");
    else if (art.cases > 0) parts.push("完成 " + art.cases + " 个案件");
    return parts.join("，");
  }

  function applyIllustration() {
    const art = ILLUSTRATIONS.find(function (item) { return item.id === settings.background; });
    if (art && !illustrationUnlocked(art)) {
      settings.background = "";
      saveSettings();
    }
    const selected = ILLUSTRATIONS.find(function (item) { return item.id === settings.background; });
    document.body.classList.toggle("has-illustration", !!selected);
    if (illustrationBackground) {
      illustrationBackground.style.backgroundImage = selected ? 'url("' + selected.src + '")' : "";
      illustrationBackground.style.backgroundPosition = selected ? selected.position : "center";
    }
    const count = ILLUSTRATIONS.filter(illustrationUnlocked).length;
    const countEl = document.getElementById("backgroundUnlockCount");
    if (countEl) countEl.textContent = count + "/" + ILLUSTRATIONS.length;
  }

  function renderBackgroundGallery() {
    if (!backgroundGrid) return;
    applyIllustration();
    const unlocked = ILLUSTRATIONS.filter(illustrationUnlocked).length;
    backgroundGrid.innerHTML = ILLUSTRATIONS.map(function (art, index) {
      const isUnlocked = illustrationUnlocked(art);
      const selected = settings.background === art.id;
      return '<article class="background-card' + (isUnlocked ? " unlocked" : " locked") + (selected ? " selected" : "") + '">' +
        '<div class="background-art">' +
          '<img src="' + art.src + '" alt="' + escapeHtml(isUnlocked ? art.name : "未解锁的灰羽插画") + '" loading="lazy" />' +
          (isUnlocked ? "" : '<div class="background-lock"><span aria-hidden="true">🔒</span><strong>尚未解锁</strong><span>' + escapeHtml(illustrationRequirement(art)) + '</span></div>') +
          '<span class="background-number">0' + (index + 1) + '</span>' +
        '</div>' +
        '<div class="background-card-body"><strong>' + escapeHtml(isUnlocked ? art.name : "灰羽的秘密插画") + '</strong>' +
          '<span>' + escapeHtml(isUnlocked ? illustrationRequirement(art) : "达成条件后，这幅画会完整显现。") + '</span>' +
          '<div class="background-card-actions">' +
            '<button class="btn small' + (selected ? " primary" : "") + '" type="button" data-action="background-select" data-background="' + art.id + '"' + (isUnlocked ? "" : " disabled") + '>' + (selected ? "使用中" : "设为背景") + '</button>' +
            '<button class="btn small" type="button" data-action="background-view" data-background="' + art.id + '"' + (isUnlocked ? "" : " disabled") + '>预览</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");
    const reset = document.getElementById("backgroundReset");
    if (reset) reset.textContent = settings.background ? "不使用插画背景" : "当前未使用插画背景 · 已解锁 " + unlocked + " 张";
  }

  function openBackgroundGallery() {
    closeSettings();
    renderBackgroundGallery();
    backgroundGallery.hidden = false;
    backgroundGallery.classList.remove("closing");
    requestAnimationFrame(function () { backgroundGallery.classList.add("visible"); });
    backgroundGallery.querySelector('[data-action="close-background-gallery"]').focus({ preventScroll: true });
  }

  function closeBackgroundGallery() {
    if (!backgroundGallery || backgroundGallery.hidden) return;
    backgroundViewer.hidden = true;
    backgroundGallery.classList.remove("visible");
    backgroundGallery.classList.add("closing");
    window.setTimeout(function () {
      backgroundGallery.hidden = true;
      backgroundGallery.classList.remove("closing");
    }, 180);
  }

  function applySettings() {
    document.body.dataset.uiSize = settings.uiSize;
    document.body.dataset.fontStyle = settings.fontStyle;
    document.body.dataset.theme = settings.theme;
    if (uiSize) uiSize.value = settings.uiSize;
    if (fontStyle) fontStyle.value = settings.fontStyle;
    if (textSpeed) textSpeed.value = settings.textSpeed;
    if (voiceToggle) voiceToggle.checked = settings.voice;
    if (voiceStyle) {
      voiceStyle.value = settings.voiceStyle;
      voiceStyle.disabled = !settings.voice;
    }
    if (voiceVolume) {
      voiceVolume.value = settings.voiceVolume;
      voiceVolume.disabled = !settings.voice;
      voiceVolumeLabel.textContent = settings.voiceVolume + "%";
    }
    const achSound = document.getElementById("achSound");
    if (achSound) achSound.checked = settings.achSound;
    const aiBase = document.getElementById("aiBase");
    const aiKey = document.getElementById("aiKey");
    const aiModel = document.getElementById("aiModel");
    const proxyUrl = document.getElementById("proxyUrl");
    if (aiBase) aiBase.value = settings.aiBase;
    if (aiKey) aiKey.value = settings.aiKey;
    if (aiModel) aiModel.value = settings.aiModel;
    if (proxyUrl) proxyUrl.value = settings.proxyUrl;
    window.Achievements.configure({ sound: settings.achSound });
    window.Dialogue.configure({
      speed: settings.textSpeed,
      sound: settings.voice,
      soundStyle: settings.voiceStyle,
      volume: settings.voiceVolume / 100
    });
    document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
      button.classList.toggle("selected", button.dataset.themeChoice === settings.theme);
      button.setAttribute("aria-checked", button.dataset.themeChoice === settings.theme ? "true" : "false");
    });
    applyIllustration();
  }

  function showSettings() {
    settingsPanel.hidden = false;
    settingsPanel.classList.remove("closing");
    requestAnimationFrame(function () {
      settingsPanel.classList.add("visible");
    });
  }

  function closeSettings() {
    if (settingsPanel.hidden) return;
    settingsPanel.classList.remove("visible");
    settingsPanel.classList.add("closing");
    window.setTimeout(function () {
      settingsPanel.hidden = true;
      settingsPanel.classList.remove("closing");
    }, 180);
  }

  function showWelcome() {
    let hasSeen = false;
    try {
      hasSeen = localStorage.getItem(WELCOME_KEY) === "1";
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
    if (!welcomeScreen || hasSeen) return;
    welcomeScreen.hidden = false;
    window.setTimeout(function () {
      welcomeScreen.classList.add("visible");
    }, 30);
    let index = 0;
    welcomeTimer = window.setInterval(function () {
      if (welcomeScreen.hidden) return;
      index = (index + 1) % welcomeLines.length;
      window.Dialogue.typeInto(welcomeLine, welcomeLines[index], { voice: "guide" });
    }, 4600);
  }

  function closeWelcome() {
    if (!welcomeScreen || welcomeScreen.hidden) return;
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
    window.clearInterval(welcomeTimer);
    welcomeScreen.classList.remove("visible");
    welcomeScreen.classList.add("closing");
    window.setTimeout(function () {
      welcomeScreen.hidden = true;
      welcomeScreen.classList.remove("closing");
    }, 360);
  }

  function save() {
    const payload = {
      completed: Array.from(savedCompleted),
      completedHard: Array.from(completedHard),
      current: state.scriptId ? {
        scriptId: state.scriptId,
        phase: state.phase,
        mode: state.mode,
        collected: state.collected,
        doneActions: state.doneActions,
        answers: state.answers,
        attempts: state.attempts,
        hints: state.hints,
        results: state.results,
        score: state.score
      } : null
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function resetCase() {
    state.collected = [];
    state.doneActions = [];
    state.answers = {};
    state.attempts = {};
    state.hints = {};
    state.results = {};
    state.score = 0;
    state.aiChat = [];
    state.statedDeductions = [];
    state.closingPlaced = {};
    state.closingSelected = null;
    state.closingChecked = false;
    state.closingSolved = false;
  }

  function resetAnswers() {
    state.answers = {};
    state.attempts = {};
    state.hints = {};
    state.results = {};
  }

  function setPhase(phase) {
    state.phase = phase;
    save();
    render();
    window.scrollTo({ top: 0 });
  }

  function speakerPortrait(line) {
    // Only the guide has artwork; other speakers get an initial badge.
    if (line.s !== "guide") return null;
    return MASCOT.portraits[line.pose || "idle"] || MASCOT.portraits.idle;
  }

  function playLines(lines, onDone) {
    const host = document.getElementById("vnHost");
    if (!host || !lines || !lines.length) {
      if (onDone) onDone();
      return;
    }
    window.Dialogue.play(host, lines, {
      speakers: script().speakers,
      portrait: speakerPortrait,
      onLine: function (line) {
        if (line.s === "guide" && line.pose) setFullbody(line.pose);
      },
      onDone: onDone
    });
  }

  function render() {
    window.Dialogue.stop();
    if (state.phase === "menu") renderMenu();
    else if (state.phase === "intro") renderIntro();
    else if (state.phase === "investigate") renderInvestigate();
    else if (state.phase === "deduce") renderDeduce();
    else if (state.phase === "ending") renderEnding();
    else if (state.phase === "immerse") renderImmerse();
    else if (state.phase === "closing") {
      if (state.closingSolved) renderClosingTruth();
      else renderClosing();
    }
    if (homeTrigger) homeTrigger.hidden = state.phase === "menu";
    document.body.classList.toggle("case-active", state.phase !== "menu");
    applyIllustration();
    // Lets the notebook know which case's notes to show.
    document.body.dataset.caseId = state.scriptId || "";
    document.dispatchEvent(new CustomEvent("game:render"));
  }

  function renderMenu() {
    react("menu");
    const cards = SCRIPTS.map(function (s) {
      const completed = savedCompleted.has(s.id);
      const locked = !!s.locked;
      return "" +
        '<button class="card' + (locked ? ' locked' : '') + '" data-action="select" data-id="' + escapeHtml(s.id) + '"' + (locked ? ' aria-disabled="true"' : '') + '>' +
          '<div class="card-cover">' + escapeHtml(s.cover) + '</div>' +
          '<div class="card-body">' +
            '<div class="card-title">' + escapeHtml(s.title) + '</div>' +
            '<div class="card-sub">' + escapeHtml(s.subtitle) + '</div>' +
            '<div class="card-meta">难度：' + escapeHtml(s.difficulty) + ' · ' + escapeHtml(s.source) + '</div>' +
            (completed ? '<span class="badge ok">已破案</span>' : '') +
            (completedHard.has(s.id) ? '<span class="badge hard">困难通关</span>' : '') +
            (locked ? '<span class="badge muted-badge">制作中</span>' : '') +
          '</div>' +
        '</button>';
    }).join("");
    app.innerHTML =
      '<header class="screen-header">' +
        '<p class="eyebrow">文学推理</p>' +
        '<h1>谜案重启</h1>' +
        '<p class="tagline">用轻量剧本杀的方式，把推理文学改造成可互动的网页体验。</p>' +
      '</header>' +
      '<section class="intro-strip">' +
        '<div><strong>读一段故事</strong><span>像视觉小说一样，跟着角色的对白进入原著。</span></div>' +
        '<div><strong>亲手搜证</strong><span>询问嫌疑人、勘察现场，把线索收进背包。</span></div>' +
        '<div><strong>写下推理</strong><span>简单模式做选择，困难模式亲自填出真相。</span></div>' +
      '</section>' +
      '<div class="card-grid">' + cards + '</div>';
  }

  function select(id) {
    const s = SCRIPTS.find(function (x) { return x.id === id; });
    if (!s) return;
    if (s.locked) {
      guide("这个本子还在制作中。先玩能破案的那个，比较不容易尴尬。", "unimpressed", "unimpressed");
      return;
    }
    state.scriptId = id;
    if (!s.immersive && state.mode === "immerse") state.mode = "easy";
    resetCase();
    setPhase("intro");
  }

  function modeButton(mode, title, text) {
    const selected = state.mode === mode;
    return '<button type="button" class="mode' + (selected ? ' selected' : '') + '" data-action="mode" data-mode="' + mode + '" aria-pressed="' + selected + '">' +
      '<strong>' + title + '</strong><span>' + text + '</span></button>';
  }

  function renderIntro() {
    const s = script();
    const chars = s.characters.map(function (c) {
      return '<div class="char">' +
        '<div class="char-name">' + escapeHtml(c.name) + '</div>' +
        '<div class="char-meta">' + escapeHtml(c.title) + ' · 动机：' + escapeHtml(c.motive) + '</div>' +
        '<div class="char-meta muted">不在场证明：' + escapeHtml(c.alibi) + '</div>' +
      '</div>';
    }).join("");
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">案件导入</p><h2>' + escapeHtml(s.title) + '</h2><p class="muted">' + escapeHtml(s.source) + '</p></header>' +
      '<div id="vnHost" class="vn-host"></div>' +
      '<div id="afterScene" class="reveal" hidden>' +
        '<section class="panel"><h3>案件概要</h3><p class="story">' + escapeHtml(s.summary) + '</p>' +
          '<p class="victim">被害人：<strong>' + escapeHtml(s.victim) + '</strong></p></section>' +
        '<section class="panel"><h3>嫌疑人</h3><div class="char-grid">' + chars + '</div></section>' +
        '<div class="actions"><button class="btn primary" data-action="investigate">开始调查</button><button class="btn" data-action="intro">重看开场</button><button class="btn" data-action="menu">返回选关</button></div>' +
      '</div>';
    playLines(s.scenes.intro, function () {
      document.getElementById("afterScene").hidden = false;
      react("intro");
    });
  }

  function immersePose(type) {
    if (type === "challenge" || type === "refuse_spoiler") return { expr: "unimpressed", pose: "unimpressed" };
    if (type === "confirm_partial" || type === "nudge_frontier") return { expr: "thinking", pose: "thinking" };
    return { expr: "neutral", pose: "idle" };
  }

  function renderImmerse() {
    const s = script();
    const actionBtns = s.actions.map(function (a) {
      const done = state.doneActions.indexOf(a.id) >= 0;
      return '<button class="action' + (done ? ' done' : '') + '" data-action="act" data-act="' + escapeHtml(a.id) + '">' +
        '<span>' + (done ? '✓ ' : '') + escapeHtml(a.label) + '</span>' +
        '<small>' + (a.type === "talk" ? "对话" : "搜证") + '</small>' +
      '</button>';
    }).join("");
    const clueItems = s.clues.map(function (c) {
      const got = state.collected.indexOf(c.id) >= 0;
      if (!got) return '<li class="locked"><span class="muted">??? 未收集</span></li>';
      return '<li class="got"><span><strong>' + escapeHtml(c.name) + '</strong> - ' + escapeHtml(c.text) + '</span>' +
        '<button type="button" class="clue-note" data-nb-note="' + escapeHtml("【线索】" + c.name + "：" + c.text) + '" title="记入笔记" aria-label="把线索“' + escapeHtml(c.name) + '”记入笔记">＋笔记</button></li>';
    }).join("");
    const chatHtml = state.aiChat.map(function (m) {
      const who = m.role === "user" ? "你" : "灰羽";
      return '<div class="immerse-msg ' + (m.role === "user" ? "user" : "guide") + '"><span class="immerse-who">' + who + '</span><p>' + escapeHtml(m.content) + '</p></div>';
    }).join("");
    const empty = (!state.aiChat.length && !aiBusy)
      ? '<p class="muted">先去和人物对话、勘察现场，把线索收进背包；想清楚后，把你的推理写给我。</p>'
      : "";
    const thinking = aiBusy ? '<div class="immerse-msg guide thinking"><span class="immerse-who">灰羽</span><p><em>……我在想。</em></p></div>' : "";
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">沉浸推理 · ' + escapeHtml(s.title) + '</p><h2>搜证、对话、推理</h2>' +
        '<p class="muted">已收集线索：' + state.collected.length + '/' + s.clues.length + '</p></header>' +
      '<div id="vnHost" class="vn-host"></div>' +
      '<section class="panel"><h3>调查行动</h3><div class="action-grid">' + actionBtns + '</div></section>' +
      '<section class="panel"><h3>线索背包</h3><ul class="clue-list">' + clueItems + '</ul></section>' +
      '<section class="panel immerse-panel"><h3>推理对谈</h3>' +
        '<div id="immerseChat" class="immerse-chat" aria-live="polite">' + empty + chatHtml + thinking + '</div>' +
        '<div class="immerse-input">' +
          '<textarea id="immerseInput" rows="3" placeholder="写下你的推理或疑问……（Enter 发送，Shift+Enter 换行）"></textarea>' +
          '<div class="immerse-actions">' +
            '<button class="btn primary" type="button" data-action="immerse-send"' + (aiBusy ? " disabled" : "") + '>和灰羽讨论</button>' +
            '<button class="btn" type="button" data-action="immerse-closing"' + (aiBusy ? " disabled" : "") + '>真相揭示</button>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<div class="actions"><button class="btn" data-action="intro">重看开场</button><button class="btn" data-action="menu">返回选关</button></div>';
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  function renderClosing() {
    const s = script();
    const c = s.closing;
    if (!c) { setPhase("immerse"); return; }
    const wrongSet = {};
    if (state.closingChecked) {
      c.slots.forEach(function (slot) {
        if (state.closingPlaced[slot.id] !== slot.answer) wrongSet[slot.id] = true;
      });
    }
    const segHtml = c.segments.map(function (seg) {
      if (seg.slot != null) {
        const placed = state.closingPlaced[seg.slot];
        let cls = "closing-slot";
        if (placed) cls += " filled";
        if (state.closingChecked && placed) cls += wrongSet[seg.slot] ? " wrong" : " correct";
        return '<button class="' + cls + '" type="button" data-slot="' + seg.slot + '">' + (placed ? escapeHtml(placed) : "＿＿") + '</button>';
      }
      return '<span class="closing-text">' + escapeHtml(seg.text) + '</span>';
    }).join("");
    const used = {};
    Object.keys(state.closingPlaced).forEach(function (k) { used[state.closingPlaced[k]] = true; });
    const frags = shuffle(c.fragments).filter(function (f) { return !used[f]; }).map(function (f) {
      const selected = state.closingSelected === f ? " selected" : "";
      return '<button class="closing-frag' + selected + '" type="button" draggable="true" data-frag="' + escapeHtml(f) + '">' + escapeHtml(f) + '</button>';
    }).join("");
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">真相揭示 · ' + escapeHtml(s.title) + '</p><h2>拼出真相</h2>' +
        '<p class="muted">' + escapeHtml(c.intro || "把真相的关键拼起来。") + '</p></header>' +
      '<section class="panel"><h3>真相还原</h3><p class="closing-sentence">' + segHtml + '</p>' +
        '<p class="closing-tray-label muted">文字块：点击选中，再点缺口放入；也可以直接拖动。</p>' +
        '<div class="closing-tray">' + frags + '</div></section>' +
      '<div class="actions"><button class="btn primary" data-action="closing-check">检查真相</button><button class="btn" data-action="closing-back">返回对谈</button><button class="btn" data-action="menu">返回选关</button></div>';
  }

  function renderClosingTruth() {
    const s = script();
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">真相揭示 · 破案</p><h2>你亲自拼出了真相</h2>' +
        '<p class="muted">' + escapeHtml(s.title) + '</p></header>' +
      '<div id="vnHost" class="vn-host"></div>' +
      '<div id="afterScene" class="reveal" hidden>' +
        '<section class="panel"><h3>真相一句话</h3><p class="story">' + escapeHtml(s.solution) + '</p></section>' +
        '<div class="actions"><button class="btn primary" data-action="menu">返回选关</button><button class="btn" data-action="retry">重开本案</button><button class="btn" data-action="replay-truth">重看真相</button></div>' +
      '</div>';
    playLines(s.scenes.truth, function (skipped) {
      if (!skipped) window.Achievements.unlock("read_truth");
      document.getElementById("afterScene").hidden = false;
      react("ending_perfect");
      guide("漂亮。这一局，是你自己把真相拼出来的。", "neutral", "idle");
    });
  }

  function openClosing() {
    state.closingPlaced = {};
    state.closingSelected = null;
    state.closingChecked = false;
    state.closingSolved = false;
    setPhase("closing");
  }

  function selectFragment(text) {
    if (state.closingSelected === text) state.closingSelected = null;
    else state.closingSelected = text;
    state.closingChecked = false;
    renderClosing();
  }

  function placeFragment(slotId, text) {
    if (text == null || text === "") return;
    state.closingPlaced[slotId] = text;
    state.closingSelected = null;
    state.closingChecked = false;
    renderClosing();
  }

  function clearSlot(slotId) {
    delete state.closingPlaced[slotId];
    state.closingChecked = false;
    renderClosing();
  }

  function tapSlot(slotId) {
    if (state.closingPlaced[slotId]) { clearSlot(slotId); return; }
    if (state.closingSelected) placeFragment(slotId, state.closingSelected);
  }

  function checkClosing() {
    const s = script();
    const c = s.closing;
    if (!c) return;
    const allFilled = c.slots.every(function (slot) { return state.closingPlaced[slot.id]; });
    if (!allFilled) {
      guide("还有空没填。把所有文字块都放进去，再检查。", "thinking", "thinking");
      return;
    }
    const ok = c.slots.every(function (slot) { return state.closingPlaced[slot.id] === slot.answer; });
    state.closingChecked = true;
    if (ok) {
      state.closingSolved = true;
      savedCompleted.add(s.id);
      window.Achievements.unlock("first_case");
      save();
      setPhase("closing");
    } else {
      renderClosing();
      guide("有几处还不对。没关系，换一下文字块再试一次。", "unimpressed", "unimpressed");
    }
  }

  function submitImmerse() {
    if (aiBusy) return;
    if (!script().immersive) return;
    const input = document.getElementById("immerseInput");
    const text = (input && input.value ? input.value : "").trim();
    if (!text) return;
    const history = state.aiChat.slice();
    state.aiChat.push({ role: "user", content: text });
    if (input) input.value = "";
    aiBusy = true;
    renderImmerse();
    const messages = window.Coach.buildMessages(
      script().id,
      script().coach,
      history,
      state.collected.slice(),
      state.statedDeductions,
      text
    );
    window.Coach.ask({ base: settings.aiBase, key: settings.aiKey, model: settings.aiModel, proxyUrl: settings.proxyUrl }, messages)
      .then(handleImmerseReply)
      .catch(function (err) {
        aiBusy = false;
        state.aiChat.push({ role: "assistant", content: "（出错了）" + (err && err.message ? err.message : "请检查设置里的 AI 配置。") });
        renderImmerse();
        guide("我这边信号不太好。去设置里检查一下 AI 配置？", "unimpressed", "unimpressed");
      });
  }

  function handleImmerseReply(parsed) {
    const reply = String(parsed.reply == null ? "" : parsed.reply).trim();
    aiBusy = false;
    if (!reply || /^[\u2026\u3002.\u22ef\u30fb\uff5e~]+$/.test(reply)) {
      renderImmerse();
      guide("……我刚才没接上话。你换个说法，或者说得更具体一点，我再陪你推。", "unimpressed", "unimpressed");
      return;
    }
    state.aiChat.push({ role: "assistant", content: reply });
    (parsed.unlockedDeductionIds || []).forEach(function (id) {
      if (state.statedDeductions.indexOf(id) < 0) state.statedDeductions.push(id);
    });
    renderImmerse();
    const pose = immersePose(parsed.feedbackType);
    guide(reply, pose.expr, pose.pose);
    const input = document.getElementById("immerseInput");
    if (input) input.focus();
  }

  function renderInvestigate() {
    const s = script();
    const actionBtns = s.actions.map(function (a) {
      const done = state.doneActions.indexOf(a.id) >= 0;
      return '<button class="action' + (done ? ' done' : '') + '" data-action="act" data-act="' + escapeHtml(a.id) + '">' +
        '<span>' + (done ? '✓ ' : '') + escapeHtml(a.label) + '</span>' +
        '<small>' + (a.type === "talk" ? "对话" : "搜证") + '</small>' +
      '</button>';
    }).join("");
    const clueItems = s.clues.map(function (c) {
      const got = state.collected.indexOf(c.id) >= 0;
      if (!got) return '<li class="locked"><span class="muted">??? 未收集</span></li>';
      return '<li class="got"><span><strong>' + escapeHtml(c.name) + '</strong> - ' + escapeHtml(c.text) + '</span>' +
        '<button type="button" class="clue-note" data-nb-note="' + escapeHtml("【线索】" + c.name + "：" + c.text) + '" title="记入笔记" aria-label="把线索“' + escapeHtml(c.name) + '”记入笔记">＋笔记</button></li>';
    }).join("");
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">调查阶段 · ' + modeName() + '</p><h2>搜证与问询</h2>' +
        '<p class="muted">已收集线索：' + state.collected.length + '/' + s.clues.length + '</p></header>' +
      '<div id="vnHost" class="vn-host"></div>' +
      '<section class="panel"><h3>调查行动</h3><div class="action-grid">' + actionBtns + '</div></section>' +
      '<section class="panel"><h3>线索背包</h3><ul class="clue-list">' + clueItems + '</ul></section>' +
      '<div class="actions"><button class="btn primary" data-action="deduce">进入推理</button><button class="btn" data-action="intro">重看开场</button><button class="btn" data-action="menu">返回选关</button></div>';
  }

  function doAction(actId) {
    const s = script();
    const a = s.actions.find(function (x) { return x.id === actId; });
    if (!a) return;
    const newClues = a.clueIds.filter(function (cid) { return state.collected.indexOf(cid) < 0; });
    renderImmerse();
    document.getElementById("vnHost").scrollIntoView({ behavior: "smooth", block: "nearest" });
    // Clues are handed over once the scene has been read (or skipped).
    playLines(a.lines, function () {
      if (state.doneActions.indexOf(a.id) < 0) state.doneActions.push(a.id);
      newClues.forEach(function (cid) { state.collected.push(cid); });
      save();
      if (state.collected.length) window.Achievements.unlock("first_clue");
      if (state.collected.length >= s.clues.length) window.Achievements.unlock("all_clues");
      renderImmerse();
      const names = newClues.map(function (cid) {
        return "「" + s.clues.find(function (c) { return c.id === cid; }).name + "」";
      });
      if (names.length) guide("新线索入袋：" + names.join("") + "。别只收藏，想想它指向谁。", "talk", "investigate");
      else react(a.type === "search" ? "search" : "talk");
    });
  }

  function modeName() {
    if (state.mode === "hard") return "困难";
    if (state.mode === "immerse") return "沉浸";
    return "简单";
  }

  function optionLabel(q, oid) {
    const s = script();
    if (q.kind === "character") {
      const c = s.characters.find(function (x) { return x.id === oid; });
      return { label: c ? c.name : oid, locked: false };
    }
    const c = s.clues.find(function (x) { return x.id === oid; });
    if (!c) return { label: oid, locked: false };
    if (state.collected.indexOf(oid) < 0) return { label: "??? 未发现线索", locked: true };
    return { label: c.name, locked: false };
  }

  // Wrong suspects' names: an answer that also names them is not accepted.
  function forbiddenFor(q) {
    if (q.kind !== "character") return [];
    return script().characters.filter(function (c) { return c.id !== q.choice.answer; }).reduce(function (all, c) {
      return all.concat([c.name], c.aliases || []);
    }, []);
  }

  function renderChoice(q, head) {
    const opts = q.choice.options.map(function (oid) {
      const o = optionLabel(q, oid);
      const selected = state.answers[q.id] === oid ? " selected" : "";
      return '<button class="opt' + selected + (o.locked ? " locked" : "") + '" data-action="answer" data-q="' + escapeHtml(q.id) + '" data-opt="' + escapeHtml(oid) + '">' + escapeHtml(o.label) + '</button>';
    }).join("");
    return '<div class="question"><h3>' + head + '</h3><div class="opt-grid">' + opts + '</div></div>';
  }

  function renderFill(q, head, index) {
    const answer = q.fill.answers[0];
    const chars = Array.from(answer.text);
    const result = state.results[q.id];
    const left = MAX_ATTEMPTS - (state.attempts[q.id] || 0);
    const solved = result === "correct";
    const finished = solved || left <= 0;
    const input = '<input class="fill-input" type="text" maxlength="30" autocomplete="off" data-q="' + escapeHtml(q.id) + '"' +
      ' value="' + escapeHtml(state.answers[q.id] || "") + '" aria-label="第 ' + (index + 1) + ' 题答案"' + (finished ? " disabled" : "") +
      ' style="--chars:' + Math.max(5, chars.length + 2) + '" />';
    const parts = (q.fill.sentence || "{{0}}").split("{{0}}");
    let feedback = "";
    if (solved) feedback = '<p class="fill-feedback ok">✓ 正确。标准答案：' + escapeHtml(answer.text) + '</p>';
    else if (left <= 0) feedback = '<p class="fill-feedback bad">× 机会用完。正确答案：' + escapeHtml(answer.text) + '</p>';
    else if (result === "wrong") feedback = '<p class="fill-feedback bad">× 不对，还剩 ' + left + ' 次机会。</p>';
    else if (result === "close") feedback = '<p class="fill-feedback close">很接近了，检查一下有没有错字。这次不扣机会。</p>';
    const hint = state.hints[q.id] && !finished
      ? '<p class="fill-hint">提示：标准答案 ' + chars.length + ' 个字，第一个字是「' + escapeHtml(chars[0]) + '」。</p>'
      : "";
    const buttons = finished ? "" :
      '<div class="fill-actions">' +
        '<button type="button" class="btn small primary" data-action="check" data-q="' + escapeHtml(q.id) + '">确认</button>' +
        (state.hints[q.id] ? "" : '<button type="button" class="btn small" data-action="hint" data-q="' + escapeHtml(q.id) + '">要提示</button>') +
        '<span class="muted">剩余 ' + left + ' 次</span>' +
      '</div>';
    return '<div class="question fill' + (solved ? " solved" : (left <= 0 ? " failed" : "")) + '"><h3>' + head + '</h3>' +
      '<p class="fill-sentence">' + escapeHtml(parts[0]) + input + escapeHtml(parts[1] || "") + '</p>' +
      hint + feedback + buttons + '</div>';
  }

  function renderDeduce() {
    const s = script();
    const hard = state.mode === "hard";
    const questions = s.questions.map(function (q, index) {
      const head = '<span class="q-num">' + (index + 1) + '</span>' + escapeHtml(q.prompt);
      return hard ? renderFill(q, head, index) : renderChoice(q, head);
    }).join("");
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">推理阶段 · ' + modeName() + '</p><h2>提交你的结论</h2>' +
        '<p class="muted">' + (hard
          ? "直接写出答案。写成一句话也行，只要包含答案；错一两个字也会被宽容。"
          : "根据收集到的线索选择答案。没收集到的线索无法选择。") + '</p></header>' +
      '<div id="vnHost" class="vn-host"></div>' +
      questions +
      '<div class="actions"><button class="btn primary" data-action="submit">提交推理</button><button class="btn" data-action="investigate">返回调查</button><button class="btn" data-action="menu">返回选关</button></div>';
  }

  function answer(qid, opt) {
    state.answers[qid] = opt;
    save();
    render();
    react("answer");
  }

  function checkFill(qid) {
    const q = script().questions.find(function (x) { return x.id === qid; });
    const input = app.querySelector('.fill-input[data-q="' + qid + '"]');
    if (!q || !input || input.disabled) return;
    state.answers[qid] = input.value;
    const verdict = window.Judge.check(input.value, q.fill.answers[0], forbiddenFor(q));
    if (verdict === "empty") {
      guide("空着可不行。哪怕猜一个，也比交白卷像侦探。", "unimpressed", "unimpressed");
      input.focus();
      return;
    }
    state.results[qid] = verdict;
    if (verdict === "close") window.Achievements.unlock("close_call");
    if (verdict !== "close") state.attempts[qid] = (state.attempts[qid] || 0) + 1;
    save();
    renderDeduce();
    if (verdict === "correct") guide(pickLine("fill_correct", FILL_LINES.correct), "talk", "idle");
    else if (verdict === "close") guide(pickLine("fill_close", FILL_LINES.close), "hint", "thinking");
    else guide(pickLine("fill_wrong", FILL_LINES.wrong), "unimpressed", "unimpressed");
    const same = app.querySelector('.fill-input[data-q="' + qid + '"]:not([disabled])');
    const next = same || app.querySelector(".fill-input:not([disabled])");
    if (next) next.focus();
  }

  function isCorrect(q) {
    if (state.mode === "hard") return state.results[q.id] === "correct";
    return state.answers[q.id] === q.choice.answer;
  }

  function submit() {
    const s = script();
    const hard = state.mode === "hard";
    if (!hard && s.questions.some(function (q) { return !state.answers[q.id]; })) {
      guide("还有题没选。空着提交，看起来不像侦探，像交白卷。", "unimpressed", "unimpressed");
      return;
    }
    const pending = hard && s.questions.some(function (q) {
      return state.results[q.id] !== "correct" && (state.attempts[q.id] || 0) < MAX_ATTEMPTS;
    });
    if (pending && !confirm("还有题目没答对，而且还有机会。确定现在提交吗？")) return;
    let correct = 0;
    s.questions.forEach(function (q) { if (isCorrect(q)) correct++; });
    state.score = correct;
    savedCompleted.add(s.id);
    if (hard && correct === s.questions.length) completedHard.add(s.id);
    setPhase("ending");
    // Unlocked after the ending screen is up, so the toast doesn't fight the page change.
    const perfect = correct === s.questions.length;
    window.Achievements.unlock("first_case");
    if (perfect && !hard) window.Achievements.unlock("perfect_easy");
    if (perfect && hard) window.Achievements.unlock("perfect_hard");
    if (perfect && hard && !Object.keys(state.hints).length) window.Achievements.unlock("no_hint");
    if (correct < s.questions.length - 1) window.Achievements.unlock("fail");
  }

  function nameOf(id) {
    const s = script();
    const c = s.characters.find(function (x) { return x.id === id; }) || s.clues.find(function (x) { return x.id === id; });
    return c ? c.name : id;
  }

  function renderEnding() {
    const s = script();
    const hard = state.mode === "hard";
    const total = s.questions.length;
    const verdict = state.score === total ? "完美推理" : (state.score >= total - 1 ? "接近真相" : "推理失败");
    const answersHtml = s.questions.map(function (q) {
      const right = isCorrect(q);
      const given = hard ? (state.answers[q.id] || "未作答") : (state.answers[q.id] ? nameOf(state.answers[q.id]) : "未作答");
      const expected = hard ? q.fill.answers[0].text : nameOf(q.choice.answer);
      return '<li>' + (right ? '✓' : '×') + ' ' + escapeHtml(q.prompt) +
        ' 你的答案：' + escapeHtml(given) + (right ? '' : '，正确：' + escapeHtml(expected)) + '</li>';
    }).join("");
    const modeNote = hard
      ? "困难模式 · 用了 " + Object.keys(state.hints).length + " 次提示"
      : "简单模式 · 想挑战的话，下次试试困难模式";
    app.innerHTML =
      '<header class="screen-header"><p class="eyebrow">案件复盘</p><h2>' + verdict + '</h2>' +
        '<p class="muted">得分：' + state.score + '/' + total + ' · ' + modeNote + '</p></header>' +
      '<section class="panel"><h3>你的推理</h3><ul class="clue-list">' + answersHtml + '</ul></section>' +
      '<div id="vnHost" class="vn-host"></div>' +
      '<div id="afterScene" class="reveal" hidden>' +
        '<section class="panel"><h3>真相一句话</h3><p class="story">' + escapeHtml(s.solution) + '</p></section>' +
        '<div class="actions"><button class="btn primary" data-action="menu">返回选关</button><button class="btn" data-action="retry">重开本案</button><button class="btn" data-action="replay-truth">重看真相</button></div>' +
      '</div>';
    playLines(s.scenes.truth, function (skipped) {
      if (!skipped) window.Achievements.unlock("read_truth");
      document.getElementById("afterScene").hidden = false;
      if (state.score === total) react("ending_perfect");
      else if (state.score >= total - 1) react("ending_close");
      else react("ending_fail");
    });
  }

  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;

    if (action === "select") {
      select(el.dataset.id);
    } else if (action === "settings") {
      showSettings();
    } else if (action === "close-settings") {
      closeSettings();
    } else if (action === "background-gallery") {
      openBackgroundGallery();
    } else if (action === "close-background-gallery") {
      closeBackgroundGallery();
    } else if (action === "background-select") {
      const art = ILLUSTRATIONS.find(function (item) { return item.id === el.dataset.background; });
      if (!art || !illustrationUnlocked(art)) return;
      settings.background = art.id;
      saveSettings();
      renderBackgroundGallery();
    } else if (action === "background-none") {
      settings.background = "";
      saveSettings();
      renderBackgroundGallery();
    } else if (action === "background-view") {
      const art = ILLUSTRATIONS.find(function (item) { return item.id === el.dataset.background; });
      if (!art || !illustrationUnlocked(art)) return;
      backgroundViewer.querySelector("img").src = art.src;
      backgroundViewer.querySelector("img").alt = art.name;
      backgroundViewer.hidden = false;
    } else if (action === "close-background-viewer") {
      backgroundViewer.hidden = true;
    } else if (action === "welcome-continue") {
      closeWelcome();
    } else if (action === "mascot") {
      pokeMascot();
    } else if (action === "voice-preview") {
      window.Dialogue.preview();
    } else if (action === "intro") {
      setPhase("intro");
    } else if (action === "mode") {
      if (state.mode !== el.dataset.mode) {
        resetAnswers();
        state.aiChat = [];
        state.statedDeductions = [];
        state.closingPlaced = {};
        state.closingSelected = null;
        state.closingChecked = false;
        state.closingSolved = false;
      }
      state.mode = el.dataset.mode;
      save();
      app.querySelectorAll(".mode").forEach(function (button) {
        const on = button.dataset.mode === state.mode;
        button.classList.toggle("selected", on);
        button.setAttribute("aria-pressed", String(on));
      });
      const startBtn = document.getElementById("startCaseBtn");
      if (startBtn) startBtn.textContent = state.mode === "immerse" ? "进入沉浸推理" : "开始调查";
      if (state.mode === "hard") guide("困难模式。答案要你自己写出来，不过错一两个字我不计较。", "hint", "thinking");
      else if (state.mode === "immerse") guide("沉浸模式。把你的想法直接写给我，我来陪你推——放心，我不剧透。", "talk", "thinking");
      else guide("简单模式。选择题，但选项不会替你思考。", "talk", "idle");
    } else if (action === "investigate") {
      setPhase("immerse");
      guide("先把能问的问一遍、能查的查一遍。线索到手，我们再聊推理。", "talk", "thinking");
    } else if (action === "immerse-send") {
      submitImmerse();
    } else if (action === "immerse-closing") {
      openClosing();
    } else if (action === "closing-check") {
      checkClosing();
    } else if (action === "closing-back") {
      setPhase("immerse");
    } else if (action === "act") {
      doAction(el.dataset.act);
    } else if (action === "deduce") {
      const s = script();
      if (state.collected.length < s.clues.length && !confirm("还有线索未收集，确定进入推理吗？")) return;
      setPhase("deduce");
      playLines(s.scenes.deduce, function () {
        document.getElementById("vnHost").innerHTML = "";
        react("deduce");
        const first = app.querySelector(".fill-input:not([disabled])");
        if (first) first.focus();
      });
    } else if (action === "answer") {
      if (!el.classList.contains("locked")) answer(el.dataset.q, el.dataset.opt);
    } else if (action === "check") {
      checkFill(el.dataset.q);
    } else if (action === "hint") {
      state.hints[el.dataset.q] = true;
      save();
      renderDeduce();
      guide("只给开头。剩下的，靠你自己。", "hint", "thinking");
    } else if (action === "submit") {
      submit();
    } else if (action === "replay-truth") {
      render();
    } else if (action === "retry") {
      const mode = state.mode;
      select(state.scriptId);
      state.mode = mode;
      save();
    } else if (action === "menu") {
      const hasProgress = state.scriptId && (state.phase === "investigate" || state.phase === "deduce");
      if (hasProgress && !confirm("返回选关会清空当前案件的调查进度，确定吗？")) return;
      state.scriptId = null;
      resetCase();
      setPhase("menu");
    } else if (action === "reset-progress") {
      if (!confirm("确定要重置所有进度吗？这将清除：\n• 所有游戏进度和存档\n• 所有成就和解锁\n• 所有笔记本内容\n\n设置会被保留。")) return;
      if (!confirm("最后确认：真的要重置所有进度吗？此操作无法撤销。")) return;
      resetAllProgress();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (backgroundGallery && !backgroundGallery.hidden) {
        if (!backgroundViewer.hidden) backgroundViewer.hidden = true;
        else closeBackgroundGallery();
      } else closeSettings();
    }
    if (e.key === "Enter" && e.target.classList && e.target.classList.contains("fill-input")) {
      e.preventDefault();
      checkFill(e.target.dataset.q);
    }
    if (e.key === "Enter" && !e.shiftKey && e.target.id === "immerseInput") {
      e.preventDefault();
      submitImmerse();
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.classList && e.target.classList.contains("fill-input")) {
      state.answers[e.target.dataset.q] = e.target.value;
    }
  });

  document.addEventListener("achievement:unlock", function () {
    applyIllustration();
    if (backgroundGallery && !backgroundGallery.hidden) renderBackgroundGallery();
  });

  function resetAllProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("murder_restart_achievements_v1");
      localStorage.removeItem("murder_restart_notes_v1");
      localStorage.removeItem("murder_restart_notes_open_v1");
      localStorage.removeItem("murder_restart_welcome_seen_v1");
    } catch (e) {
      // Local file mode can disable storage.
    }
    state.scriptId = null;
    state.phase = "menu";
    state.mode = "easy";
    resetCase();
    savedCompleted.clear();
    completedHard.clear();
    if (window.Achievements && window.Achievements.reset) window.Achievements.reset();
    if (window.Notebook && window.Notebook.reset) window.Notebook.reset();
    settings.background = "";
    saveSettings();
    closeSettings();
    applySettings();
    setPhase("menu");
    guide("所有进度已重置。重新开始吧，这次也别偷懒。", "unimpressed", "unimpressed");
  }

  function updateSetting(target) {
    const key = target.dataset.setting;
    if (!key) return;
    if (target.type === "checkbox") settings[key] = target.checked;
    else if (target.type === "range") settings[key] = Number(target.value);
    else settings[key] = target.value;
    applySettings();
    saveSettings();
  }

  document.addEventListener("change", function (e) {
    updateSetting(e.target);
    if (e.target.dataset.setting === "voiceStyle" || (e.target.dataset.setting === "voice" && e.target.checked)) {
      window.Dialogue.preview();
    }
  });

  // Range sliders update live while dragging.
  document.addEventListener("input", function (e) {
    if (e.target.type === "range" && e.target.dataset.setting) updateSetting(e.target);
  });

  document.addEventListener("click", function (e) {
    const themeButton = e.target.closest("[data-theme-choice]");
    if (!themeButton) return;
    settings.theme = themeButton.dataset.themeChoice;
    applySettings();
    saveSettings();
  });

  document.addEventListener("click", function (e) {
    const frag = e.target.closest(".closing-frag");
    if (frag) { selectFragment(frag.dataset.frag); return; }
    const slot = e.target.closest(".closing-slot");
    if (slot) tapSlot(slot.dataset.slot);
  });

  document.addEventListener("dragstart", function (e) {
    const frag = e.target.closest(".closing-frag");
    if (!frag) return;
    e.dataTransfer.setData("text/plain", frag.dataset.frag);
    e.dataTransfer.effectAllowed = "move";
  });

  document.addEventListener("dragover", function (e) {
    const slot = e.target.closest(".closing-slot");
    if (!slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  document.addEventListener("drop", function (e) {
    const slot = e.target.closest(".closing-slot");
    if (!slot) return;
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    if (text) placeFragment(slot.dataset.slot, text);
  });

  function preloadMascot() {
    // Pose switches would otherwise flash while each large PNG loads.
    [MASCOT.fullbodies, MASCOT.portraits].forEach(function (group) {
      Object.keys(group || {}).forEach(function (key) {
        new Image().src = group[key];
      });
    });
  }

  function init() {
    loadSettings();
    applySettings();
    const payload = load();
    (payload.completed || []).forEach(function (id) { savedCompleted.add(id); });
    (payload.completedHard || []).forEach(function (id) { completedHard.add(id); });
    const saved = payload.current;
    if (saved && saved.scriptId) {
      const savedScript = SCRIPTS.find(function (s) { return s.id === saved.scriptId && !s.locked; });
      if (savedScript) {
        state.scriptId = saved.scriptId;
        state.phase = saved.phase;
        state.mode = saved.mode === "hard" ? "hard" : (saved.mode === "immerse" ? "immerse" : "easy");
        state.collected = saved.collected || [];
        state.doneActions = saved.doneActions || [];
        state.answers = saved.answers || {};
        state.attempts = saved.attempts || {};
        state.hints = saved.hints || {};
        state.results = saved.results || {};
        state.score = saved.score || 0;
      }
    }
    render();
    showWelcome();
    preloadMascot();
  }

  init();
})();
