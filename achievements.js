// Achievements: Steam-style unlock toasts with a chime, a progress panel, and a reward
// illustration once everything is unlocked. Other scripts call Achievements.unlock(id).
(function () {
  "use strict";

  const STORE_KEY = "murder_restart_achievements_v1";
  // Put the AI-made reward illustration here (any size; portrait works best).
  const REWARD_SRC = "assets/reward/huiyu_reward.png";

  // hidden: name and description stay secret until unlocked (Steam "hidden achievement").
  // goal: progress achievements show "n / goal" in the panel.
  const LIST = [
    { id: "first_clue", icon: "线", name: "第一条线索", desc: "在调查中获得第一条线索。" },
    { id: "all_clues", icon: "搜", name: "地毯式搜查", desc: "在一个案件中收集到全部线索。" },
    { id: "first_case", icon: "初", name: "初出茅庐", desc: "完成一次推理（任意难度、任意结果）。" },
    { id: "perfect_easy", icon: "证", name: "证据确凿", desc: "在简单模式下答对全部推理题。" },
    { id: "perfect_hard", icon: "真", name: "亲笔写下真相", desc: "在困难模式下答对全部推理题。" },
    { id: "no_hint", icon: "独", name: "不需要提示", desc: "在困难模式下答对全部推理题，且一次提示都没用。" },
    { id: "read_truth", icon: "读", name: "一字不漏", desc: "不跳过，完整读完一场真相揭晓。" },
    { id: "first_note", icon: "记", name: "侦探的习惯", desc: "在笔记本里写下第一条笔记。" },
    { id: "quote_note", icon: "引", name: "白纸黑字", desc: "把一句台词引用进笔记本。" },
    { id: "ten_notes", icon: "册", name: "笔记狂人", desc: "笔记本里同时存有 10 条笔记。", goal: 10 },
    { id: "playlist", icon: "乐", name: "推理需要配乐", desc: "在音乐播放器里创建一个自建歌单。" },
    { id: "poke", icon: "戳", name: "别戳了！", desc: "连续戳灰羽 6 次。", hidden: true },
    { id: "close_call", icon: "近", name: "差之毫厘", desc: "在困难模式中被判定为“很接近了”。", hidden: true },
    { id: "fail", icon: "迷", name: "与直觉私奔", desc: "推理失败一次。", hidden: true }
  ];

  const config = { sound: true };
  let state = { unlocked: {}, progress: {} };
  const MAX_TOASTS = 3;  // shown at once, stacked like Steam; the rest wait in the queue
  const queue = [];
  let showing = 0;
  let audioCtx = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function byId(id) {
    return LIST.find(function (a) { return a.id === id; });
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      state.unlocked = saved.unlocked || {};
      state.progress = saved.progress || {};
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function unlockedCount() {
    return LIST.filter(function (a) { return state.unlocked[a.id]; }).length;
  }

  function complete() {
    return unlockedCount() === LIST.length;
  }

  function allCasesComplete() {
    try {
      const saved = JSON.parse(localStorage.getItem("murder_restart_save_v3")) || {};
      const completed = saved.completed || [];
      const cases = (window.SCRIPTS || []).filter(function (s) { return !s.locked; });
      return cases.length > 0 && cases.every(function (s) { return completed.indexOf(s.id) >= 0; });
    } catch (e) {
      return false;
    }
  }

  function rewardComplete() {
    return complete() && allCasesComplete();
  }

  // ---- sound: a soft two-note chime, similar in spirit to Steam's ----

  function chime(big) {
    if (!config.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const notes = big ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 987.77];
      notes.forEach(function (freq, i) {
        const start = now + i * (big ? 0.11 : 0.09);
        [1, 2].forEach(function (harmonic) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = harmonic === 1 ? "sine" : "triangle";
          osc.frequency.value = freq * harmonic;
          const peak = (harmonic === 1 ? 0.16 : 0.03);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + (big ? 1.1 : 0.8));
          osc.connect(gain).connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + 1.2);
        });
      });
    } catch (e) {
      // Audio is optional.
    }
  }

  // ---- toasts ----

  const toastHost = document.createElement("div");
  toastHost.className = "ach-toasts";
  toastHost.setAttribute("aria-live", "polite");
  document.body.appendChild(toastHost);

  function showNext() {
    if (showing >= MAX_TOASTS || !queue.length) return;
    showing++;
    const item = queue.shift();
    const toast = document.createElement("button");
    toast.type = "button";
    toast.className = "ach-toast" + (item.big ? " big" : "");
    toast.innerHTML =
      '<span class="ach-icon" aria-hidden="true">' + escapeHtml(item.icon) + "</span>" +
      '<span class="ach-toast-text"><small>' + escapeHtml(item.kicker) + "</small><strong>" + escapeHtml(item.title) + "</strong></span>";
    toast.addEventListener("click", function () { openPanel(); });
    toastHost.appendChild(toast);
    // Toasts that arrive together share one chime instead of piling up sounds.
    if (item.big || !toastHost._lastChime || Date.now() - toastHost._lastChime > 400) {
      toastHost._lastChime = Date.now();
      chime(item.big);
    }
    window.setTimeout(function () {
      toast.classList.add("leaving");
      window.setTimeout(function () {
        toast.remove();
        showing--;
        showNext();
      }, 450);
    }, item.big ? 6500 : 4800);
  }

  function toast(item) {
    queue.push(item);
    while (showing < MAX_TOASTS && queue.length) showNext();
  }

  // ---- public actions ----

  function unlock(id) {
    const a = byId(id);
    if (!a || state.unlocked[id]) return false;
    state.unlocked[id] = Date.now();
    save();
    toast({ icon: a.icon, kicker: "成就已解锁", title: a.name });
    if (complete()) toast({ icon: "★", kicker: "全部成就达成！", title: allCasesComplete() ? "终章背景已解锁：真相晚宴" : "完成全部关卡，解锁终章背景", big: true });
    renderButton();
    if (!panel.hidden) renderPanel();
    document.dispatchEvent(new CustomEvent("achievement:unlock", { detail: { id: id, complete: complete() } }));
    return true;
  }

  function progress(id, value) {
    const a = byId(id);
    if (!a || !a.goal || state.unlocked[id]) return;
    state.progress[id] = Math.max(state.progress[id] || 0, Math.min(value, a.goal));
    save();
    if (state.progress[id] >= a.goal) unlock(id);
  }

  function reset() {
    state = { unlocked: {}, progress: {} };
    save();
    renderButton();
    renderPanel();
  }

  // ---- panel ----

  const button = document.getElementById("achToggle");
  const countEl = document.getElementById("achCount");
  const panel = document.createElement("section");
  panel.className = "ach-overlay";
  panel.hidden = true;
  panel.setAttribute("aria-label", "成就");
  panel.innerHTML =
    '<div class="ach-backdrop" data-ach="close"></div>' +
    '<div class="ach-dialog" role="dialog" aria-modal="true" aria-labelledby="achTitle">' +
      '<div class="ach-head"><div><p class="eyebrow">收集</p><h2 id="achTitle">成就</h2></div>' +
      '<button type="button" class="icon-button" data-ach="close" aria-label="关闭成就" title="关闭">×</button></div>' +
      '<div class="ach-summary"></div>' +
      '<div class="ach-reward"></div>' +
      '<ol class="ach-list"></ol>' +
      '<div class="ach-foot"><span>成就记录保存在当前浏览器中。</span><button type="button" class="ach-reset" data-ach="reset">重置全部成就</button></div>' +
    "</div>" +
    '<div class="ach-viewer" hidden data-ach="close-viewer"><img alt="灰羽的特别插画" /><p>点击任意处关闭</p></div>';
  document.body.appendChild(panel);

  function formatDate(ms) {
    const d = new Date(ms);
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function renderButton() {
    if (!button) return;
    countEl.textContent = unlockedCount() + "/" + LIST.length;
    button.classList.toggle("complete", complete());
  }

  function renderPanel() {
    const done = unlockedCount();
    const percent = Math.round(done / LIST.length * 100);
    panel.querySelector(".ach-summary").innerHTML =
      '<div class="ach-summary-row"><strong>已解锁 ' + done + " / " + LIST.length + "</strong><span>" + percent + "%</span></div>" +
      '<div class="ach-bar"><i style="width:' + percent + '%"></i></div>';

    const reward = panel.querySelector(".ach-reward");
    if (rewardComplete()) {
      reward.className = "ach-reward unlocked";
      reward.innerHTML =
        '<button type="button" class="ach-reward-art" data-ach="view"><img src="' + REWARD_SRC + '" alt="灰羽的特别插画" /></button>' +
        '<div><strong>终章奖励：真相晚宴</strong><span>全成就、全关卡达成。可在设置的“灰羽插画背景”中设为网页背景。</span></div>';
      const img = reward.querySelector("img");
      img.addEventListener("error", function () {
        reward.querySelector(".ach-reward-art").outerHTML =
          '<div class="ach-reward-art missing">插画还没放进来<br><code>' + REWARD_SRC + "</code></div>";
      });
    } else {
      reward.className = "ach-reward";
      reward.innerHTML =
        '<div class="ach-reward-art locked" aria-hidden="true"><span>🔒</span></div>' +
        "<div><strong>终章奖励：？？？</strong><span>收集全部 " + LIST.length + " 个成就并完成全部关卡后解锁。当前成就 " + done + " / " + LIST.length + "。</span></div>";
    }

    // Unlocked first (newest first), then visible locked, then hidden locked — like Steam.
    const sorted = LIST.slice().sort(function (a, b) {
      const ua = state.unlocked[a.id] || 0;
      const ub = state.unlocked[b.id] || 0;
      if (ua || ub) return ub - ua;
      return (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0);
    });
    panel.querySelector(".ach-list").innerHTML = sorted.map(function (a) {
      const time = state.unlocked[a.id];
      const secret = a.hidden && !time;
      let extra = "";
      if (time) extra = '<span class="ach-time">解锁于 ' + formatDate(time) + "</span>";
      else if (a.goal) {
        const value = state.progress[a.id] || 0;
        extra = '<span class="ach-progress"><span class="ach-bar small"><i style="width:' + Math.round(value / a.goal * 100) + '%"></i></span>' + value + " / " + a.goal + "</span>";
      }
      return '<li class="ach-item' + (time ? " unlocked" : " locked") + '">' +
        '<span class="ach-icon" aria-hidden="true">' + (secret ? "?" : escapeHtml(a.icon)) + "</span>" +
        '<span class="ach-item-text"><strong>' + (secret ? "隐藏成就" : escapeHtml(a.name)) + "</strong>" +
        "<span>" + (secret ? "继续游玩以解锁这个成就的详情。" : escapeHtml(a.desc)) + "</span>" + extra + "</span>" +
      "</li>";
    }).join("");
  }

  function openPanel() {
    renderPanel();
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("visible"); });
    if (button) button.setAttribute("aria-expanded", "true");
    panel.querySelector('.ach-dialog [data-ach="close"]').focus({ preventScroll: true });
  }

  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove("visible");
    panel.querySelector(".ach-viewer").hidden = true;
    window.setTimeout(function () { panel.hidden = true; }, 180);
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.focus({ preventScroll: true });
    }
  }

  panel.addEventListener("click", function (e) {
    const target = e.target.closest("[data-ach]");
    if (!target) return;
    const action = target.dataset.ach;
    if (action === "close") closePanel();
    else if (action === "view") {
      const viewer = panel.querySelector(".ach-viewer");
      viewer.querySelector("img").src = REWARD_SRC;
      viewer.hidden = false;
    } else if (action === "close-viewer") panel.querySelector(".ach-viewer").hidden = true;
    else if (action === "reset") {
      if (confirm("确定重置全部成就吗？解锁记录和进度都会清空。")) reset();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || panel.hidden) return;
    const viewer = panel.querySelector(".ach-viewer");
    if (!viewer.hidden) viewer.hidden = true;
    else closePanel();
  });

  if (button) button.addEventListener("click", openPanel);
  document.addEventListener("game:render", function () {
    if (!panel.hidden) renderPanel();
  });

  load();
  renderButton();

  window.Achievements = {
    unlock: unlock,
    progress: progress,
    open: openPanel,
    count: unlockedCount,
    total: LIST.length,
    complete: complete,
    configure: function (values) {
      Object.keys(values || {}).forEach(function (key) { config[key] = values[key]; });
    },
    isUnlocked: function (id) { return !!state.unlocked[id]; }
  };
})();
